var _ = require('underscore'),
	mongoose = require('mongoose'),
	middleware = require('./../code/middleware'),
	CalendarMonth = mongoose.model('CalendarMonth'),
	User = mongoose.model('User');

module.exports = function(app, passport) {


	/**
	 * Get user's availability for a given month
	 *
	 * Query string should contain username, year and month values.
	 *
	 */
	app.get('/api/v1/calendar', function (req, res) {

		var username = req.param('username') || null,
			year = req.param('year') || null,
			month = req.param('month') || null,
			events = [];

		User.findByUsername(username, function(err, user) {

			if (err || ! user || ! user.get('_id')) {
				return res.send({ status: 'error', reason: 'Could not find user ' + username });
			}

			CalendarMonth.findOne({
				owner: user._id,
				year: year,
				month: month
			})
			.exec(function(err, month) {

				if (err) {
					return res.send({ status: 'error' });
				}

				events = monthToEvents(month);

				return res.send({
					status: 'ok',
					me: (req.user && req.user.username && req.user.username == user.username),
					month: month,
					dates: events
				});
			});
		});

	});


	app.post('/api/v1/calendar/set', middleware.authenticateApi, function (req, res) {

		var date = req.param('date'),
			dateparts = [],
			yyyy = null,
			mm = null,
			dd = null,
			curdates = [];

		if ( ! req.param('date')) {
			return res.send({ status: 'error', reason: 'No date specified.' });
		}

		// Get date parts
		dateparts = date.split('-');
		yyyy = parseInt(dateparts[0], 10);
		mm = parseInt(dateparts[1], 10);
		dd = parseInt(dateparts[2], 10);

		CalendarMonth.findOne({
			owner: req.user._id,
			year: yyyy,
			month: mm
		})
		.exec(function(err, month) {

			if (err) {
				return res.send({ status: 'error', reason: 'Could not load month.', err: err });
			}

			// If month does not exist yet, create it
			if ( ! month) {
				month = new CalendarMonth();
				month.owner = req.user;
				month.year = yyyy;
				month.month = mm;
				month.busyDates.push(dd);
			} else {

				// Check if the posted date is in the list of busyDates already
				if (_.indexOf(month.busyDates, dd) === -1) {
					// Not present - add.
					month.busyDates.push(dd);
				} else {
					// Already present - remove.
					month.busyDates = _.without(month.busyDates, dd);
				}

				month.busyDates = month.busyDates.sort();
			}

			month.save(function(err) {

				if (err) {
					return res.send({ status: 'error', reason: 'Could not save month.', err: err });
				}

				return res.send({
					status: 'ok',
					me: true,
					month: month,
					dates: monthToEvents(month),
				});
			});


		});

	});


	/**
	 * Parse a month's busy dates array and return objects where each object contains a "date" property of the busy day
	 *
	 */
	monthToEvents = function(month) {

		var mm = 0,
			dd = 0,
			events = [];

		if (month && month.busyDates) {

			mm = ("0" + month.month).slice(-2);
			events = _.map(month.busyDates, function(day) {

				dd = ("0" + day).slice(-2);
				return {
					date: month.year + '-' + mm + '-' + dd,
					title: 'busy'
				}
			});
		}

		return events;
	}


}
