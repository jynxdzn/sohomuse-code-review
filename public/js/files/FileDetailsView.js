define(function(require) {

    var backbone = require('backbone'),
        jquery = require('jquery'),
        vent = require('vent'),
        models = require('./../models/models'),
        navigate = require('navigate'),
        overlay = require('./../overlay/overlay'),
        marionette = require('marionette'),
        _ = require('underscore'),
        FileUploadView = require('./../file_upload/FileUploadView'),
        tmpl = require('text!./FileDetailsView.html'),
        roles = require('data/roles.js');

    return marionette.Layout.extend({

        options: null,

        tagName: 'div',

        className: 'fileDetails',

        attributes: {
            style: 'margin-top: 30px'
        },

        events: {
            'click .save' : 'saveMe',
            'click .exit' : 'closeMe',
            'click .edit': 'openImageEditor',
            'click .delete': 'removeMe',
            'click .add-credit': 'addCredit',
            'click .remove-credit': 'removeCredit'
        },

        regions: {
            fileupload: "#fileupload"
        },

        ui: {
            preview: '#preview',
            name: '#name',
            description: '#description',
            shares: '#shares',
            tags: '#tags',
            ownerCredit: '#ownerCredit',
            isPrivate: '#isPrivate',
            showInGallery: '#showInGallery',
            showInShowcase: '#showInShowcase',
            makeBackgroundImg: '#makeBackgroundImg',
            showcaseTitle: '#showcaseTitle',
            showcaseText: '#showcaseText',
            mainBtnGroup: '.btn-group-main',
            cropBtnGroup: '.btn-group-crop'
        },

        template: function(model) {
            var data = _.extend(model, { roles: roles });
            return _.template(tmpl, data);
        },

        onRender: function() {

            var self = this;
            this.featherEditor = new Aviary.Feather({
                apiKey: '866a91dd464577d4',
                apiVersion: 3,
                theme: 'dark', // Check out our new 'light' and 'dark' themes!
                tools: 'all',
                appendTo: '',
                enableCORS: true,
                onSave: function(imageID, newURL) {
                    jquery.post(self.model.url() + '/aviary-edit', { url: newURL })
                    .success(function(data) {
                    if (data.id) {
                        self.featherEditor.close();
                        navigate('files/' + data.id);
                    }
                    });
                },
                onError: function(errorObj) {
                    alert(errorObj.message);
                }
            });

            var self = this;

            self.ui.tags.selectize({
                delimiter: ',',
                persist: false,
                create: function(input) {
                    return { value: input, text: input };
                }
            });

            if(self.model.get('owner') == window.this_user.id) {
                if(self.model.get('isAudio')) {
                    self.fileupload.show(new FileUploadView({
                        dropZone: self.$el,
                        submitUrl: '/api/v1/files/' + self.model.get('_id') + '/upload-thumbnail',
                        onUploadCb: function(err, result) {
                            if(err) {
                                overlay.alert('The image could not be attached to this file.');
                                return;
                            }
                            //Backbone.history.loadUrl(); // Reload page (NB might want something slicker than this in future)
                            location.reload();
                        }
                    }));
                }
            }

            jquery.get('/api/v1/contacts?type=contacts').success(function(data) {

                var options = _.map(data, function (contact) {
                    return {
                        id: contact._id,
                        name: contact.firstName + ' ' + contact.lastName
                    };
                });

                self.ui.shares.selectize({
                    delimiter: ',',
                    valueField: 'id',
                    labelField: 'name',
                    searchField: ['name'],
                    options: options
                });

                self.options = options;

                var credits_inputs = self.$el.find('input.credit-user.is-current');
                credits_inputs.selectize({
                    maxItems: 1,
                    valueField: 'id',
                    labelField: 'name',
                    searchField: ['name'],
                    options: options
                });
            });

            this.profile = new models.Profile({ me: true });
            this.profile.fetch({
                success: function(res) {
                    if (res.attributes.bgimage == self.model.get('_id')) {
                        self.ui.makeBackgroundImg.prop('checked', true);
                    }
                }
            });

            var credits_roles = self.$el.find('select.credit-user-role.is-current');

            credits_roles.selectize({
                create: function(input) {
                    return { value: input, text: input };
                },
                sortField: 'text'
            });
        },

        openImageEditor: function (event) {
            event.preventDefault();

            var options = {
                image: 'preview',
                url: window.location.origin + '/api/v1/files/' + this.model.get('_id') + '/download'
            };

            this.featherEditor.launch(options);
        },

        removeMe: function(event) {
            event.preventDefault();
            var self = this;
            overlay.confirm('You are about to delete this file. Are you sure?', function(yes) {
                if (yes) {
                    self.model.destroy({
                        success: function() {
                            navigate('files');
                        }
                    });
                }
            });
        },

        saveMe: function() {

            this.model.set('name', this.ui.name.val());
            this.model.set('description', this.ui.description.val());
            this.model.set('ownerCredit', this.ui.ownerCredit.val());
            this.model.set('isPrivate', this.ui.isPrivate.is(':checked'));
            this.model.set('showInGallery', this.ui.showInGallery.is(':checked'));
            this.model.set('showInShowcase', this.ui.showInShowcase.is(':checked'));
            this.model.set('showcaseTitle', this.ui.showcaseTitle.val());
            this.model.set('showcaseText', this.ui.showcaseText.val());

            var shares = this.ui.shares.val();

            if (shares && shares.length) {
                this.model.set('shared_with', shares.split(','));
            } else {
                this.model.set('shared_with', []);
            }

            var tags = this.ui.tags.val();
            if (tags && tags.length) {
                this.model.set('tags', tags.split(','));
            } else {
                this.model.set('tags', []);
            }

            var credits = [],
                credits_users = this.$el.find('input[name="credit_user"]'),
                credits_roles = this.$el.find('select[name="credit_role"]'),
                idx = 0,
                user = null,
                role = null;

            for (idx; idx < credits_users.length; idx = idx + 1) {
                user = $(credits_users[idx]).val();
                role = $(credits_roles[idx]).val();
                if (user && role) {
                    credits.push({
                        role: role,
                        contact: user
                    });
                }
            }

            this.model.set('credits', credits);

            this.model.save(null, {
                success: function(model) {
                    overlay.alert('The file has been updated.');
                }
            });

            // If make background iamge
            if (this.ui.makeBackgroundImg.is(':checked')) {
                this.profile.save({ bgimage: this.model.attributes._id }, { patch: true, silent: true });
            }
        },

        closeMe: function() {
            navigate('files');
        },

        chooseArt: function() {
            this.fileupload.getEl('.panel').addClass('active');
        },

        addCredit: function() {

            var $empty = $('.empty-credit'),
                $add = $empty.clone();

            $add.appendTo('.new-credits').removeClass('hidden').removeClass('empty-credit');

            $add.find("input[name='credit_user']").selectize({
                maxItems: 1,
                valueField: 'id',
                labelField: 'name',
                searchField: ['name'],
                options: this.options
            });
        },

        removeCredit: function(e) {
            e.preventDefault();
            var $parent = $(e.currentTarget).parents(".form-group");
            $parent.remove();
        }

    });

});
