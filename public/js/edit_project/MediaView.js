define(function(require) {

    var img_width = 180, img_height = 180;

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        lightbox = require('fresco'),
        jquery = require('jquery'),
        models = require('./../models/models'),
        tmpl = require('text!./MediaFileView.html'),
        styles = require('css!./style');

    var FileView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'col-md-2 media-item',

        attributes: {
            style: "margin-bottom: 20px"
        },

        template: function(model) {
            return _.template(tmpl, _.extend(model, {
            	img_width: img_width,
            	img_height: img_height,
            	type: (model.file.type == 'local' ? 'image' : 'video')
            }));
        }

    });

    var FilesView = marionette.CollectionView.extend({

        tagName: 'div',
        className: '',
        itemView: FileView

    });

    return function(files) {
        return new FilesView({
            collection: files
        });
    };

});
