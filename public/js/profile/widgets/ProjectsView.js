define(function(require) {

    var img_width = 240, img_height = 180;

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        lightbox = require('fresco'),
        jquery = require('jquery'),
        models = require('./../../models/models'),
        tmpl = require('text!./ProjectsView.html'),
        styles = require('css!./style.projects.css'),
        projectSummaryTmpl = require('text!./ProjectSummaryView.html');

    var ProjectSummaryView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'project-summary',

        template: function(model) {
            return _.template(projectSummaryTmpl, model);
        }

    });

    var ProjectsSummaryView = marionette.CollectionView.extend({

        tagName: 'div',
        className: 'projects-inner',
        itemView: ProjectSummaryView,

    });

    var ProjectsView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'projects-list',

        ui: {
            selectors: '.projects-filter',
            all: '.projects-all',
            active: '.projects-active',
            complete: '.projects-complete',
        },

        events: {
            'click .projects-all': 'filterAll',
            'click .projects-active': 'filterActive',
            'click .projects-complete': 'filterComplete'
        },

        onRender: function() {
            var p = new ProjectsSummaryView({
                collection: this.options.projects
            });

            this.$el.find('.projects-viewport').append(p.el);

            //this.updateHeight();
        },

        updateHeight: function() {
        	// Get available height
            var h = $(".profile-body.visible").height();
            this.$el.find('.projects-inner').height(h - 80);
        },

        template: function() {
            return _.template(tmpl);
        },

        filterAll: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.all.addClass('active');
            this.options.projects.fetch({ data: $.param({}) });
        },

        filterActive: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.active.addClass('active');
            this.options.projects.fetch({ data: $.param({ status: 'active' }) });
        },

        filterComplete: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.complete.addClass('active');
            this.options.projects.fetch({ data: $.param({ status: 'complete' }) });
        }

    });

    return function(username) {
    	var projects = new models.Projects();

        var view = new ProjectsView({
            projects: projects
        });

        projects.url = '/api/v1/projects?username=' + username;
        projects.fetch();

        return view;
    };

});
