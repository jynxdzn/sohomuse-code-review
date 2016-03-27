define(function(require) {
	var backbone = require('backbone'),
		marionette = require('marionette'),
		_ = require('underscore'),
		jquery = require('jquery'),
		models = require('./../../models/models'),
		socialNetworks = require('data-social'),
        styles = require('css!./style.representation.css'),
		tmpl = require('text!./RepresentationView.html');

	return marionette.ItemView.extend({
		tagName: 'div',

		className: 'profile-representation',

		template: function(model) {
			return _.template(tmpl, _.extend(model.toJSON(), {
				baseUrl: '',
				representation: model.get('representation').toJSON(),
				networks: socialNetworks
			}));
		},

		render: function() {
			this.$el.html(this.template(this.model));
		}
	});
});
