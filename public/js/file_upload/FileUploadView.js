// NB initialise with {submitUrl: ...}
// You can also add {onUploadCb: ...} callback, which is a function of the form: cb(err)
define(function(require) {

    var marionette = require('marionette'),
        jquery = require('jquery'),
        vent = require('vent'),
		overlay = require('./../overlay/overlay'),
        tmpl = require('text!./FileUploadView.html'),
		blueimpfileupload = require('blueimp-fileupload');

    return marionette.ItemView.extend({

        template: function() {
            return _.template(tmpl);
        },

		onRender: function() {
			var loadingBar = this.$el.find('.loading-bar');

			// Overwrite functions so they adjust the visibility rather than display.
			// This ensures the physical space in the layout is still there, just out of sight.
			loadingBar.hide = function() { $(this).css("visibility", "hidden"); };
			loadingBar.show = function() { $(this).css("visibility", "visible"); };

			loadingBar.hide();

			var self = this;
			var opt = jquery.extend({
				dataType: 'json',
				url: this.options.submitUrl,
                done: function(e, data) {
					$.each(data.result, function (index, file) {
						if(file) {
							vent.trigger('files:file_added', file[0]);
						}
					});

					if(self.options.onUploadCb) {
						self.options.onUploadCb(null, data);
					}
					loadingBar.hide();
				},
				fail: function(e, data) {
					if(self.options.onUploadCb) {
						self.options.onUploadCb(data);
					}
				},
				onUpload: function(index, file) {
					loadingBar.show();
				},
				add: function (e, data) {
                    var goUpload = true;
                    var uploadFile = data.files[0];
                    if (uploadFile.size > 20971520) { // 20mb
                        overlay.alert('Please upload a smaller image, max size is 20 MB');
                        goUpload = false;
                    }
                    if (goUpload === true) {
						loadingBar.show();
                        data.formData = { postNews: ($("input.postnews-file[name='postNews']").is(":checked") ? 1 : 0) };
						data.submit();
					}
				}
			}, this.options || {});

			this.$el.find('.fileupload').fileupload(opt);
		}
    });
});
