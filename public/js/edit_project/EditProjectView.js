define(function(require) {

    var marionette = require('marionette'),
        _ = require('underscore'),
        backbone = require('backbone'),
        jquery = require('jquery'),
        navigate = require('navigate'),
        globals = require('globals'),
        datepicker = require('jquery.ui.datepicker'),
        tmpl = require('text!./EditProjectView.html'),
        models = require('./../models/models'),
        selectize = require('selectize'),
        overlay = require('./../overlay/overlay'),
        bootstrap_tab = require('bootstrap.tab'),
        styles = require('css!./style'),
        MediaView = require('./MediaView'),
        FileSelectorView = require('./../file_selector/FileSelectorView'),
        GalleryView = require('./../profile/widgets/GalleryView');

	var Media = Backbone.Collection.extend({
		model: models.File
	});

    return marionette.Layout.extend({

        tagName: 'div',

        className: 'edit_project',

        events: {
			'change': 'applyChange',
            'click .save': 'saveMe',
            'click .delete': 'deleteMe',
            'click .add-file': 'showAddFile',
            'click .remove-item': 'removeItem'
        },

		regions: {
			container: ".container"
		},

        ui: {
        	'collaborators': '#collaborators',
        	'userRoles': '#userRoles',
        	'requiredRoles': '#requiredRoles'
        },

        initSelectize: function() {

            var self = this;

            self.ui.userRoles.selectize({
                delimiter: ',',
                persist: false,
                create: function(input) {
                    return {
                        value: input,
                        text: input
                    };
                }
            });

            self.ui.requiredRoles.selectize({
                delimiter: ',',
                persist: false,
                create: function(input) {
                    return {
                        value: input,
                        text: input
                    };
                }
            });

            $.get('/api/v1/contacts?type=contacts').success(function(data) {

                var options = _.map(data, function (contact) {
                    return {
                        id: contact._id,
                        name: contact.firstName + ' ' + contact.lastName
                    };
                });

                self.ui.collaborators.selectize({
                    delimiter: ',',
                    valueField: 'id',
                    labelField: 'name',
                    searchField: ['name'],
                    options: options
                });
            });
        },

        template: function(model) {
            return _.template(tmpl, _.extend(model));
        },

        onRender: function() {
            var self = this;

            this.$el.find(".datepicker").datepicker({
				dateFormat: "yy-mm-dd"
            });

            this.initSelectize();

            var current_collaborators = _.map(self.model.get('collaborators') || [], function(collab) {
            	return (collab ? collab._id : null);
            });

            self.ui.collaborators.val(current_collaborators.join(','));

            // Take note of the tab that was chosen
			this.$el.find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
				self.active_tab = $(e.target)[0].hash;
			});

			// Reactivate the tab if present
			if (this.active_tab) {
            	this.$el.find('[data-toggle="tab"][href="' + this.active_tab + '"]').trigger("click");
			}

			// Get media items and render the view
            var files = new MediaView(new Backbone.Collection(this.model.get('files')));
            this.$el.find(".project_files").html(files.render().el);

    		//globals.setBackgroundBlank();
        },

		applyChange: function(event){
            var target = event.target;
			var $target = $(target);
			var change = {};
			var targvalue = target.value;
            if($target.attr('type') == 'checkbox') {
                targvalue = $target.is(':checked');
            }
			else if($target.data('type') == 'multi') { // if multi split into array
				targvalue = target.value.split(',');
			}

			if(target.name.indexOf('.') === -1) { // this is to catch nested values
				change[target.name] = targvalue;
			} else {
				var targname = target.name.split('.');
				var changeNested = this.model.attributes[targname[0]];
				changeNested[targname[1]] = targvalue;
				change[targname[0]] = changeNested;
			}

            if (target.name == 'status') {
                switch (target.value) {
                    case 'live':
                        change.isLive = true;
                        change.isComplete = false;
                        break;
                    case 'complete':
                        change.isComplete = true;
                        change.isLive = false;
                        break;
                    default:
                        change.isLive = false;
                        change.isComplete = false;
                }
            }

			this.model.set(change);
		},

        saveMe: function() {
            var self = this,
            	collaborators = this.ui.collaborators.val(),
            	userRoles = this.ui.userRoles.val(),
            	requiredRoles = this.ui.requiredRoles.val();

            if (collaborators && collaborators.length) {
                this.model.set('collaborators', collaborators.split(','));
            } else {
                this.model.set('collaborators', []);
            }

            if (userRoles && userRoles.length) {
                this.model.set('userRoles', userRoles.split(','));
            } else {
                this.model.set('userRoles', []);
            }

            if (requiredRoles && requiredRoles.length) {
                this.model.set('requiredRoles', requiredRoles.split(','));
            } else {
                this.model.set('requiredRoles', []);
            }

			this.model.save(null, {
				success: function (model) {
					model.fetch({
						success: function() {
							self.render();
						}
					});
					overlay.alert('The project has been saved.');
				},
				error: function () {
					overlay.alert('There was a problem saving the project, please refresh the page and try again.');
				}
			});

        },

        deleteMe: function() {
            var self = this;
            overlay.confirm('You are about to delete this project. Are you sure?', function(yes) {
                if (yes) {
                    self.model.destroy();
                    navigate('projects');
                }
            });
        },

        showAddFile: function() {
            var self = this;
            FileSelectorView.show({
                select: function(fileModel) {
                    self.doAddFile(fileModel);
                    overlay.reset();
                }
            });
        },

        doAddFile: function(m) {

            var self = this,
                data = {},
                fileType = null;

            // Eugh.
            if (m.attributes.isImage) {
                fileType = 'image';
            } else if(m.attributes.isAudio) {
                fileType = 'audio';
            } else if (m.attributes.isVideo) {
                fileType = 'video';
            } else if (m.attributes.isDocument) {
                fileType = 'document';
            } else {
                fileType = 'other';
            }

            data = {
                project: self.model.get("_id"),
                file: m.id,
                type: fileType,
                action: "add",
            };

            $.post('/api/v1/projects/media', data).done(function(res) {
                self.model.fetch({
                    success: function() {
                        self.render();
                    }
                });
            });
        },

        removeItem: function(el) {

        	var self = this,
        		data = $(el.currentTarget).data();

        	data = _.extend(data, {
        		project: self.model.get("_id"),
        		action: "remove"
        	});

            // console.log(data);

        	$.post('/api/v1/projects/media', data).done(function(res) {
        		self.model.fetch({
					success: function() {
						self.render();
					}
				});
			});
        }

    });
});
