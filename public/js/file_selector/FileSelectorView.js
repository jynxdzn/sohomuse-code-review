define(function(require) {

    var jquery = require('jquery'),
        marionette = require('marionette'),
        vent = require('vent'),
        overlay = require('./../overlay/overlay'),
        models = require('./../models/models'),
        tmpl = require('text!./FileSelectorView.html'),
        fileTmpl = require('text!./FileView.html'),
        styles = require('css!./style');

    var limit = 10;

    var FileView = marionette.ItemView.extend({

        tagName: 'li',
        className: 'img-item',
        style: 'margin-bottom: 20px;',

        template: function(model) {
            return _.template(fileTmpl, model);
        },

        useImage: function(e) {
            var self = this;
            e.preventDefault();
            vent.trigger('files:fileSelected', this.model);
        }

    });

    var FilesView = marionette.CollectionView.extend({
        tagName: 'ul',
        itemView: FileView
    });

    var FileSelectorView = marionette.Layout.extend({

        className: 'container',

        regions: {
            thumbs: ".thumbs"
        },

        events: {
            'click .prev': 'fetchPrev',
            'click .next': 'fetchNext',
            'click img': 'selectFile',
            'click .dismiss' : 'dismissMe'
        },

        dismissMe: function () {
            vent.trigger('overlay:reset');
        },

        selectFile: function(event) {
            var id = jquery(event.currentTarget).data('id');
            var file = this.files.get(id);
            this.options.select(file);
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        fetch: function() {
            this.files.fetch({ data: $.param(this.options.params)});
        },

        fetchPrev: function() {
            this.options.params.skip -= limit;

            if (this.options.params.skip < 0) {
                this.options.params.skip = 0;
            }

            this.files.fetch({ data: $.param(this.options.params)});
        },

        fetchNext: function() {
            var self = this;
            if (this.files.length == limit) {
                this.options.params.skip += limit;
                this.files.fetch({
                    data: $.param(this.options.params),
                    success: function(){
                        if (self.files.length === 0) {
                            self.fetchPrev();
                        }
                    }
                });
            }
        },

        onBeforeRender: function() {

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }

            if (typeof this.options.only_images !== 'undefined') {
                this.options.params.image = true;
            }

            if (typeof this.options.only_videos !== 'undefined') {
            	this.options.params.video = true;
            }

            if (typeof this.options.select != 'function') {
                this.options.select = function() {};
            }

            this.options.params.take = limit;
            this.options.params.skip = 0;

            if (!this.options.params.type) {
                this.options.params.type = 'my_files';
            }

            this.files = new models.Files();
            this.fetch();
        },

        onRender: function() {
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
				url: this.options.projectImageSubmitUrl,
				add: function (e, data) {
                    var uploadFile = data.files[0];
                    if (uploadFile.size > 20971520) { // 20mb
                        overlay.alert('Please upload a smaller file, max size is 20 MB');
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
/*
					if(!data.result.isImage) {
						overlay.alert('The uploaded file was not accepted as an image - please try again.');
						return;
					}*/

				// Fetch the images again (there's likely a less wasteful way of doing this)
				// [Apply/Trigger selection]
					var mediaFile = new models.File({_id: data.result._id});
					mediaFile.fetch({
						success: function() {
							self.options.select(mediaFile);
						}
					});
				},
				fail: function(e, data) {
					overlay.alert('The file upload failed - please try again.');
                    console.log(data);
				}
			}, this.options || {});

			this.$el.find('.fileupload').fileupload(opt);

            this.thumbs.show(new FilesView({ collection: this.files }));
        }
    });

    function show(options) {
		var args = {};

        if (typeof options == 'function') {
			args.select = options;
        } else if (typeof options == 'object') {
			args = options;
        }
		args.projectImageSubmitUrl = '/api/v1/files/upload';

		overlay.show(new FileSelectorView(args));
    }

    function hide() {
        overlay.reset();
    }

    return {
        show: show,
        model: FileSelectorView,
        hide: hide
    };
});
