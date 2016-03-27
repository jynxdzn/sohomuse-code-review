define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        jquery = require('jquery'),
        models = require('./../../models/models'),
        styles = require('css!./style.about.css'),
        tmpl = require('text!./AboutView.html');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'profile-about',

        template: function(model) {
            return _.template(tmpl, _.extend({ baseUrl: '' }, model));
        }

    });

});
