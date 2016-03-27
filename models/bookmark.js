var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Bookmark = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    added: { type : Date, default : Date.now },
    notes: String
}, { strict: true });

Bookmark.index({owner: 1, target: 1}, {unique: true});


Bookmark.statics.isBookmarked = function(owner_id, target_id, cb) {
	this.findOne({
		owner: owner_id, target: target_id
	}, function(err, bookmark) {
		if(err) {
			return cb(err);
		}

		return cb(null, (bookmark) ? bookmark : false);
	});
}


module.exports = mongoose.model('Bookmark', Bookmark);
