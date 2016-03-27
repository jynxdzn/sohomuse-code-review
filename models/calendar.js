var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var CalendarMonth = new Schema({
	owner: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	year: { type: Number },
	month: { type: Number, min: 1, max: 12 },
	busyDates: [Number],
}, { strict: true });

CalendarMonth.index({ owner: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('CalendarMonth', CalendarMonth);