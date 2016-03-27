define(function(require) {

	var jquery = require('jquery'),
		backbone = require('backbone'),
		marionette = require('marionette'),
		moment = require('moment'),
		vent = require('vent'),
		navigate = require('navigate'),
		clndr = require('clndr'),
		overlay = require('./../overlay/overlay'),
		styles = require('css!./style');
		tmplMini = require('text!./CalendarMini.html'),
		tmplContainerMini = require('text!./CalendarContainerMini.html'),
		tmplBig = require('text!./CalendarBig.html'),
		tmplContainerBig = require('text!./CalendarContainerBig.html'),
		tmpl = null;


	var CalendarView = marionette.ItemView.extend({

		className: 'calendar',

		editable: null,
		updating: false,

		events: {
			'click .btn-enquire': 'enquire'
		},

		ui: {
			'container': '.calendar-container'
		},


		initialize: function() {
			// Load big or small template depending on size parameter used
			tmpl = (this.options.size === 'mini' ? tmplContainerMini : tmplContainerBig);
			tmplClndr = (this.options.size === 'mini' ? tmplMini : tmplBig);
		},


		onRender: function() {

			var self = this;

			// When main template renders, create calendar instance
			this.cal = this.ui.container.clndr({
                extras: this.options,
				template: tmplClndr,
				weekOffset: 1,
				showAdjacentMonths: true,
				forceSixRows: true,
				daysOfTheWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
				startWithMonth: moment(),
				doneRendering: function() {
					// self.ui.container.height(self.ui.container.height() + "px");
				},
				clickEvents: {

					onMonthChange: function(month) {
						self.loadMonth(month.format('YYYY'), month.format('MM'));
					},

					click: function(target) {

						if (self.editable === false) return false;

						if (self.updating === true) return;
						self.updating = true;

						self.toggleBusy(target.date.format('YYYY-MM-DD'), function(res) {
							self.updating = false;
							if (res.status === 'ok') {
								// Good stuff! Update the events
								self.cal.setEvents(res.dates);
							} else {
								overlay.alert('There was a problem saving your availability, please refresh the page and try again.');
							}
						});
					}

				}
			});

			// Initially load some dates
			this.loadMonth();
		},


		template: function() {
			return _.template(tmpl);
		},


		/**
		 * Load the selected month from the API to get the busy dates of the user.
		 * Successful loading will update the clndr events list and should re-render the calendar view.
		 *
		 */
		loadMonth: function(_yyyy, _mm) {

			var self = this,
				year = _yyyy || moment().format('YYYY'),
				month = _mm || moment().format('MM'),
				params = {
					username: self.options.username,
					year: year,
					month: month
				};

			$.get('/api/v1/calendar', params, function(res) {
				// The returned array of dates are the "busy" dates of the user
				self.setEditable(res.me);
				self.cal.setEvents(res.dates);
			});
		},


		/**
		 * Toggle the busy status of a given date (year, month and day)
		 *
		 * @param string date		Date should be in format YYYY-MM-DD
		 * @param cb function		Callback function
		 *
		 */
		toggleBusy: function(date, cb) {

			var self = this;

			$.post('/api/v1/calendar/set', { date: date }, function(res) {
				cb(res);
			});
		},


		/**
		 * Keep track of whether the calendar is editable based on the current user status returned from a loadMonth() call.
		 *
		 */
		setEditable: function(editable) {

			// If we have already set the status then we can safely skip this
			if (this.editable !== null) { return; }

			this.editable = editable;

			if (editable) {
				$(this.ui.container).addClass('is-editable');
			} else {
				$(this.ui.container).removeClass('is-editable');
			}
		},


		/**
		 * Enquire about availability
		 *
		 */
		enquire: function() {
			navigate('messages', { rcpt: this.options.username });
		}


	});


	return function(username, size) {
		return new CalendarView({
			username: username,
			size: size || 'mini'
		});
	}

});
