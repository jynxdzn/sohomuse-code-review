define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
		vent = require('vent'),
        navigate = require('navigate'),
        globals = require('globals'),
        models = require('./../models/models'),
        projectTmpl = require('text!./ProjectView.html'),
        tmpl = require('text!./ProjectsListView.html');

    var ProjectView = marionette.ItemView.extend({
        template: function(model) {
            return _.template(projectTmpl, model);
        },

        events: {
            'click .delete': 'removeMe'
        },

        removeMe: function() {
            var self = this;
            overlay.confirm('You are about to delete this project. Are you sure?', function(yes) {
                if (yes) {
                    self.model.destroy();
                }
            });
        }

    });

    var ProjectsView = marionette.CollectionView.extend({

        itemView: ProjectView,

        appendHtml: function(collectionView, itemView){
            collectionView.$el.prepend(itemView.el);
        }
    });

    return marionette.Layout.extend({

        tagName: 'div',

        className: 'projects',

        attributes: {
            style: 'margin-top: 15px'
        },

        refresh: function() {
            this.projects.fetch({ data: $.param(this.options.params) });
        },

        regions: {
            content: '.content',
        },

        events: {
        	'click .new-project': 'createNewProject'
        },

        template: function() {
            return _.template(tmpl);
        },

        onRender: function() {

        	var self = this;

            this.projects = new models.Projects();
            this.projects.fetch();

            var projectsView = new ProjectsView({
                collection: this.projects
            });

            this.$el.find('.content').html(projectsView.el);
            //globals.setBackgroundBlank();
        },

        createNewProject: function() {
            navigate('/projects/add');
        }

    });
});
