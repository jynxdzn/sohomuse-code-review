define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        jquery = require('jquery'),
        navigate = require('navigate'),
        _ = require('underscore'),
        vent = require('vent'),
        models = require('./../models/models'),
		globals = require('globals'),
        overlay = require('./../overlay/overlay'),
        tmpl = require('text!./PaneView.html'),
        styles = require('css!./style');

    return marionette.Layout.extend({

        tagName: 'div',
        className: 'pane-wrapper',

		initialize: function() {
            var self = this;
            _.bindAll(this, 'setFrost');
		},

        template: function(model) {
            return _.template(tmpl, model);
        },

        regions: {
            meta: '.pane-meta',
            content: '.pane-content'
        },

        onRender: function() {
            var self = this;
        },

        setFrost: function(show) {
            if (show) {
                this.$el.addClass("has-frost");
            } else {
                this.$el.removeClass("has-frost");
            }
        }

    });

});
