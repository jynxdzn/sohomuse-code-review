define(function(require) {

    var models = require('./../models/models'),
        jquery = require('jquery'),
        backbone = require('backbone'),
        vent = require('vent'),
        navigate = require('navigate'),
        marionette = require('marionette'),
        _ = require('underscore'),
        globals = require('globals'),
        overlay = require('./../overlay/overlay'),
        tmpl = require('text!./FilesView.html'),
		fileTmpl = require('text!./FileView.html'),
        FileUploadView = require('./../file_upload/FileUploadView'),
        styles = require('css!./style');

    var FileView = marionette.ItemView.extend({

        template: function(model) {
            return _.template(fileTmpl, model);
        },

        events: {
            'click .delete': 'removeMe'
        },

        removeMe: function() {
            var self = this;
            overlay.confirm('You are about to delete this file. Are you sure?', function(yes) {
                if (yes) {
                    self.model.destroy();
                    self.refresh();
                }
            });
        }

    });

    var FilesView = marionette.CollectionView.extend({
        itemView: FileView,
        appendHtml: function(collectionView, itemView){
            collectionView.$el.prepend(itemView.el);
        }
    });

    return marionette.Layout.extend({

        tagName: 'div',

        className: 'files',

        attributes: {
            style: 'margin-top:40px'
        },

		refresh: function() {
            this.files.fetch({ data: $.param(this.options.params)});
		},

		regions: {
			container: ".container",
			fileupload: "#fileupload"
		},

        ui: {
            q: '#q',
            url: '.url'
        },

        events: {
            'click .files': 'fetchFiles',
            'click .gallery': 'fetchGalleryFiles',
            'click .shared_files': 'fetchSharedFiles',
            'submit .form-search': 'query',
            'click .urlAdd': 'addExternalFile',
        },

        onBeforeRender: function() {

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }

            if (!this.options.params.type) {
                this.options.params.type = 'my_files';
            }

            this.model = new backbone.Model(this.options.params);
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        onRender: function() {

            var self = this;

            vent.on('files:file_added', function() {
                self.refresh();
            });

            this.ui.q.val(this.options.params.q);

            this.files = new models.Files();
            this.files.fetch({ data: $.param(this.options.params)});

            var filesView = new FilesView({
                collection: this.files
            });

            this.$el.find('#files').html(filesView.el);

			this.fileupload.show(new FileUploadView({ dropZone: this.$el, submitUrl: '/api/v1/files/upload' }));

			globals.setBackgroundBlank();
        },

        query: function(event) {
            event.preventDefault();
            this.options.params.q = this.ui.q.val();
            navigate('files', this.options.params);
        },

        fetchFiles: function(event) {
            event.preventDefault();
            if (this.options.params.type != 'my_files') {
                this.options.params.type = 'my_files';
                navigate('files', this.options.params);
            }
        },

        fetchGalleryFiles: function(event) {
            event.preventDefault();
            if (this.options.params.type != 'gallery') {
                this.options.params.type = 'gallery';
                navigate('files', this.options.params);
            }
        },

        fetchSharedFiles: function(event) {
            event.preventDefault();
            if (this.options.params.type != 'shared_files') {
                this.options.params.type = 'shared_files';
                navigate('files', this.options.params);
            }
        },

        addExternalFile: function(event) {
            event.preventDefault();
            var self = this;
            var url = this.ui.url.val();
            if (url) {
                jquery.post('/api/v1/files/add', {
                    url: url,
                    postNews: ($("input.postnews-video[name='postNews']").is(":checked") ? 1 : 0)
                }).success(function(res) {
                	if (res && res.error) {
                		overlay.alert('Error adding external file. Check the URL and try again.');
                	} else {
	                    self.ui.url.val('');
	                    vent.trigger('files:file_added');
                	}
                });
            }
        }

    });
});
