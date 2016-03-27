define(function(require) {

    var img_width = 100, img_height = 75;

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        jquery = require('jquery'),
        vent = require('vent'),
        models = require('./../../models/models'),
        tmpl = require('text!./ProjectMediaView.html');

    var ProjectMediaItemView = marionette.ItemView.extend({

        tagName: 'div',

        template: function(model) {

            var file = (model.file && model.fileType ? model.file : model);

            var type = file.type,
                tmpl = '',
                width = 556,
                height = 400;

            if (type == 'local') {
                tmpl = '<img src="/api/v1/files/' + file._id + '/thumb?height=400&width=556" class="img-responsive" />';
				
				if(file.isAudio) {
					tmpl += '<audio controls>'
						+ '<source src="/api/v1/files/' + file._id + '/download" type="audio/mpeg">'
						+ '	Your browser does not support the audio tag.'
						+ '</audio>';
				} else if(file.isDocument) {
					tmpl = '<a href="/api/v1/files/' + file._id + '/download">' + tmpl + '</a>'
						+ '<p><a href="/api/v1/files/' + file._id + '/download">View</a></p>';
				}
            } else if (type == 'youtube') {
                var url1 = '//www.youtube.com/embed/' + file.external_id;
                tmpl = '<iframe frameborder="0" allowfullscreen="0" src="' + url1 + '?autoplay=1&amp;controls=1&amp;enablejsapi=1&amp;hd=1&amp;modestbranding=1&amp;rel=0" width="' + width + '" height="' + height + '"></iframe>';
            } else if (type == 'vimeo') {
                var url2 = '//player.vimeo.com/video/' + file.external_id;
                tmpl = '<iframe src="' + url2 + '" width="' + width + '" height="' + height + '" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
            } else {
                var url = '/api/v1/files/' + file._id;
                tmpl = '';
            }

            return _.template(tmpl, file);
        }

    });

    var FileView = marionette.ItemView.extend({

        tagName: 'a',
        className: 'project-media-thumb',

        triggers: {
            'click': 'view'
        },

        attributes: function() {

            var file = this.model.get('file'),
                fileType = this.model.get('fileType'),
                target = "_top";

            if (file && fileType) {
                // file is file
            } else {
                file = this.model.attributes;
            }

            if (file.type == 'local') {
                url = '/api/v1/files/' + file._id + '/thumb?width=800';
            }
            if (file.type == 'youtube') {
                url = 'http://www.youtube.com/watch?v=' + file.external_id;
            }
            if (file.type == 'vimeo') {
                url = 'http://vimeo.com/' + file.external_id;
            }

            if (fileType === 'other') {
                url = '/api/v1/files/' + file._id + '/download';
                target = "_blank";
            }

            return {
                href: url,
                target: target
            };
        },

        template: function(model) {
            if (model.fileType && model.file) {
                return _.template('<img style="width:' + img_width + 'px; height:' + img_height + 'px" src="/api/v1/files/<%= _id %>/thumb?height=' + img_height + '&width=' + img_width + '" />', model.file);
            } else {
                return _.template('<img style="width:' + img_width + 'px; height:' + img_height + 'px" src="/api/v1/files/<%= _id %>/thumb?height=' + img_height + '&width=' + img_width + '" />', model);
            }
        }

    });

    var FilesView = marionette.CollectionView.extend({

        tagName: 'div',
        className: 'project-media-inner',
        itemView: FileView,
        itemViewOptions: {
            img_height: img_height,
            img_width: img_width
        },

    });

    var ProjectMediaView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'project-media-thumbs-outer',

        ui: {
        },

        events: {
        },

        initialize: function() {
            // console.log(this.options.region);
        },

        onRender: function() {

            var self = this,
                collection = new models.Files(this.options.files);

            var m = new FilesView({
                collection: collection
            });

            m.render();

            this.$el.find('.project-media-viewport').html(m.el);

            var detailView = new ProjectMediaItemView({ model: collection.first() });
            self.options.region.show(detailView);

            // This catches the click event on individual items
            m.on("itemview:view", function(e) {
                if (e.model.get('fileType') === 'other') {
                    window.open(e.$el.attr('href'), '_blank');
                    return true;
                } else {
                    // Update the detail view with selected model
                    detailView.model = e.model;
                    detailView.render();
                    // Update UI selection
                    $(".project-media-thumb").removeClass("active");
                    e.$el.addClass("active");
                }
            });
        },

        template: function() {
            return _.template(tmpl);
        }

    });

    return function(project, region) {

        var view = new ProjectMediaView({
            photos: project.get("photos"),
            videos: project.get("videos"),
            files: project.get("files"),
            region: region
        });

        return view;
    };

});
