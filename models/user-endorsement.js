var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var UserEndorsement = new Schema({
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

UserEndorsement.index({owner: 1, target: 1}, {unique: true});


UserEndorsement.statics.isEndorsed = function(owner_id, target_id, cb) {
	this.findOne({
		owner: owner_id, target: target_id
	}, function(err, userEndorsement) {
		if(err) {
			return cb(err);
		}

		return cb(null, (userEndorsement) ? userEndorsement : false);
	});
}


module.exports = mongoose.model('UserEndorsement', UserEndorsement);
