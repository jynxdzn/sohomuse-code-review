define(function(require) {

    var marionette = require('marionette'),
        _ = require('underscore'),
        tmpl = require('text!./BusinessCardView.html'),
        styles = require('css!./style');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'bcard',

        attributes: {
            'style': 'background-image: url(/img/blank-card.png)'
        },

        template: function(model) {
            return _.template(tmpl, _.extend({ baseUrl: '' }, model));
        }
    });
});