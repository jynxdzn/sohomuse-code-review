define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        jquery = require('jquery'),
        vent = require('vent'),
        models = require('./../../models/models'),
        ProjectMediaView = require('./ProjectMediaView'),
        tmpl = require('text!./ProjectView.html');

    return marionette.Layout.extend({

        tagName: 'div',

        className: 'project',

        regions: {
        	'thumbs': '.project-media-thumbs',
        	'media': '.project-media-large'
        },

        onRender: function() {
        	// Media thumbnails view
        	this.projectMediaView = new ProjectMediaView(this.model, this.media);
            this.thumbs.show(this.projectMediaView);
        },

        template: function(model) {
        	var data = _.extend({baseUrl: ''}, model);

        	// add project owner as a collaborator
        	//data.collaborators = [].concat(model.owner, model.collaborators);

            return _.template(tmpl, data);
        }

    });

});
