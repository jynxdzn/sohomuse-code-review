define(function(require) {

    var img_width = 477, img_height = 240;

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        lightbox = require('fresco'),
        jquery = require('jquery'),
        models = require('./../../models/models'),
        fileTmpl = require('text!./ShowcaseFileView.html');

	var FileView = marionette.ItemView.extend({

        tagName: 'a',
        className: 'fresco bs-tooltip',

        attributes: function() {
            var type = this.model.get('type');
            var url;
            if (type == 'local') {
                url = '/api/v1/files/' + this.model.get('_id') + '/thumb?width=800';
            }
            if (type == 'youtube') {
                url = 'http://www.youtube.com/watch?v=' + this.model.get('external_id');
            }
            if (type == 'vimeo') {
                url = 'http://vimeo.com/' + this.model.get('external_id');
            }
            return {
                href: url,
                title: this.model.get('showcaseText'),
                'data-fresco-caption': this.model.get('showcaseTitle') || this.model.get('name'),
                'data-fresco-group': 'gallery',
                'data-fresco-group-options': 'thumbnails: false, preload: false'
            };
        },

        template: function(model) {
            model.img_height = img_height;
            model.img_width = img_width;
            return _.template(fileTmpl, model);
        }

    });

    var FilesView = marionette.CollectionView.extend({

        tagName: 'div',
        className: 'showreel-items',
        itemView: FileView,

        currentIndex: 0,

        paginate: function(direction) {

        	if (direction == "prev") {
        		next = this.currentIndex - 1;
        	} else if (direction == "next") {
        		next = this.currentIndex + 1;
        	}

        	if (next >= this.collection.length) {
        		return;
        	} else if (next < 0) {
        		return;
        	}

        	this.$el.children().hide();
        	$(this.$el.children()[next]).show().css("display", "block");

        	this.currentIndex = next;
        }

    });

    return function(username) {

        var files = new models.Files();
        files.url = '/api/v1/showcase/' + username;
        files.fetch({
            success: function() {
                files.trigger("files:success");
            }
        });

        return new FilesView({
            collection: files
        });
    };

});
