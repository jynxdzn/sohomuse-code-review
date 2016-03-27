define(function(require) {

    var jquery = require('jquery'),
        marionette = require('marionette'),
        vent = require('vent'),
        navigate = require('navigate'),
        overlay = require('./../overlay/overlay'),
        models = require('./../models/models'),
        tmpl = require('text!./ImageSelectorView.html'),
        fileTmpl = require('text!./ImageView.html'),
        styles = require('css!./style');

    var selectedFile = null;

    var ImageView = marionette.ItemView.extend({

        className: 'col-xs-6 col-sm-6 col-md-4 col-lg-4 img-item',

        template: function(model) {
            return _.template(fileTmpl, model);
        },

        useImage: function(e) {
            var self = this;
            e.preventDefault();
            vent.trigger('files:fileSelected', this.model);
        }

    });

    var ImagesView = marionette.CollectionView.extend({
        className: 'row',
        itemView: ImageView
    });

    return ImageSelectorView = marionette.Layout.extend({

        className: 'image-selector',

        regions: {
            thumbs: ".thumbs"
        },

        ui: {
            q: '#q'
        },

        events: {
            'click .save': 'save',
            'click .cancel': 'cancel',
            'click img': 'selectFile',
            'submit #form-search-files': 'searchFiles'
        },

        save: function(event) {
            // Call the action for saving with the chosen file.
            this.options.save(selectedFile);
        },

        cancel: function(event) {
            this.options.cancel();
        },

        selectFile: function(event) {
            // Update UI for choosing items
            jquery('.img-thumbnail').removeClass('selected');
            jquery(event.currentTarget).addClass('selected');

            // Get the file
            var id = jquery(event.currentTarget).data('id'),
                file = this.files.get(id);

            selectedFile = file;

            // Do the action that was passed on init.
            this.options.select(file);
        },

        searchFiles: function(event) {
            event.preventDefault();
            this.options.params.q = this.ui.q.val();
            navigate('image', this.options.params);
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        fetch: function() {
            this.files.fetch({ data: $.param(this.options.params)});
        },

        onBeforeRender: function() {

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }

            this.options.params.image = true;

            if (typeof this.options.select != 'function') {
                this.options.select = function() {};
            }

            if (typeof this.options.save != 'function') {
                this.options.save = function() {};
            }

            if (typeof this.options.cancel != 'function') {
                this.options.cancel = function() {};
            }

            if (!this.options.params.type) {
                this.options.params.type = 'my_files';
            }
        },

        onRender: function() {
		// Query...
			this.ui.q.val(this.options.params.q);
			
			this.files = new models.Files();
			this.files.fetch({ data: $.param(this.options.params)});
		
		// Uploading...
			var $loadingBar = this.$el.find('.loading-bar');

			// Overwrite functions so they adjust the visibility rather than display.
			// This ensures the physical space in the layout is still there, just out of sight.
			$loadingBar.hide = function() { $(this).css("visibility", "hidden"); };
			$loadingBar.show = function() { $(this).css("visibility", "visible"); };

			$loadingBar.hide();

		// Setup upload action...
			var self = this;
			var opt = jquery.extend({
				dataType: 'json',
				url: this.options.profileImageSubmitUrl,
				add: function (e, data) {
                    var uploadFile = data.files[0];
                    if (uploadFile.size > 20971520) { // 20mb
                        overlay.alert('Please upload a smaller image, max size is 20 MB');
                    } else {
						$loadingBar.show();
						data.submit();
					}
				},
    			onUpload: function(index, file) {
					$loadingBar.show();
				},
	            done: function(e, data) {
					$loadingBar.hide();

					if(!data.result.isImage) {
						overlay.alert('The uploaded file was not accepted as an image - please try again.');
						return;
					}
					
				// Fetch the images again (there's likely a less wasteful way of doing this)
				// [Apply/Trigger selection on this image]
					self.files.fetch({
						data: $.param(self.options.params),
						success: function() {
							var file = self.files.get(data.result._id);

							self.options.select(file);
							self.options.save(file);
						}
					});
					
					if(self.options.onUploadCb) {
						self.options.onUploadCb(null, data);
					}
				},
				fail: function(e, data) {
					if(self.options.onUploadCb) {
						self.options.onUploadCb(data);
					}
				}
			}, this.options || {});

			this.$el.find('.fileupload').fileupload(opt);			
			
            this.thumbs.show(new ImagesView({ collection: this.files }));
        }

    });

    return ImageSelectorView;
});
