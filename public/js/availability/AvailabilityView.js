define(function(require) {

    var jquery = require('jquery'),
        backbone = require('backbone'),
        marionette = require('marionette'),
        vent = require('vent'),
        models = require('./../models/models'),
        tmpl = require('text!./AvailabilityView.html'),
        styles = require('css!./style');

    var AvailabilityView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'availability',

        template: function() {
            return _.template(tmpl);
        }

    });

	/*
	availability {

		owner: user
		year: int
		month: int
		busy: [ int ]

	}
	*/

	return function(username) {

		/*var schedule = new models.Availability();
		schedule.url = '/api/v1/users/username/' + username + '/availability';
		schedule.fetch();*/

		var schedule = null;

		var view = new AvailabilityView({
    		schedule: schedule
    	});

        return view;
    };

});