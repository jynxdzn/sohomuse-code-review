define(function(require) {

    var marionette = require('marionette'),
        _ = require('underscore'),
        jquery = require('jquery'),
        backbone = require('backbone'),
        overlay = require('./../overlay/overlay'),
        cookie = require('jquery.cookie'),
        navigate = require('navigate'),
        tmpl = require('text!./WelcomeModalView.html');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'welcome',

        template: function() {
            return _.template(tmpl);
        },

        events: {
            'click .btn-close': 'closeMe'
        },

        closeMe: function() {
            overlay.reset();
            jquery.cookie('soho.welcome', '1', { expires: 365 });
        }

    });
});
