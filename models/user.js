var PASSWORD_RESET_EXPIRES_MINUTES = 5;

var _ = require('underscore'),
    fs = require('fs'),
    config = require('./../config'),
	mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
//	NewsItem = require('./newsitem'),
	webshot = require('webshot'),
	Async = require('async'),
	NewsItem = require('./newsitem'),
	Bookmark = require('./bookmark'),
    UserEndorsement = require('./user-endorsement'),
	search = require('mongoose-fts'),
    bcrypt = require('bcrypt'),
	Utils = require('./../code/utils');



var RepresentationSchema = new Schema({
	type: String,
	name: String,
	email: String,
	phone1: String,
	phone2: String,
	address1: String,
	address2: String,
	address3: String,
	city: String,
	state: String,
	zip: String,
	country: String
});

// Useful for Backbone - which uses id
// Add id as a virtual field from _id
// And ensure virtual fields are serialised.
RepresentationSchema.virtual('id').get(function() {
	return this._id;	//.toHexString();
})

RepresentationSchema.set('toJSON', {
	virtuals: true
});


var UserSchema = new Schema({
    graphId: Number,

	passwordResetRequested: { type: Date, default: null },
	passwordResetCode: { type: String, default: '' },

    invited: {
        by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        on: Date
    },
    firstName: String,
    lastName: String,
    phone: String,
    emails: [String],
    lastSeen: { type: Date, default: null },

	bgimage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    },

    privateProfile: { type: Boolean, default: false },
    country: { type: String, default: '' },
    city: String,
    summary: String,
    bio: String,

	career: {
		occupation: String,
        awards: String,
	},

    skills: {
        occupations: [String],
        accents: [String],
        languages: [String],
        performance: [String],
        athletic: [String],
        keywords: [String]
    },

    appearance: {
        height: String,
        weight: String,
        hair: String,
        hairLength: String,
        eyes: String
    },

    representation: [RepresentationSchema],

	bcard: {
		code: String,
		img: String,
		dimensions: [String]
	},

	social: {
		skype: String,
		twitter: String,
		facebook: String,
		instagram: String,
		linkedin: String,
		blog: String,
		website: String
	},

    status: {
        type: Schema.Types.ObjectId,
        ref: 'NewsItem',
    },

    available: Boolean,

    locationName: String,
    geo: {type: [Number], index: '2d'},

    counts: {
        connections: { type: Number, default: 0 },
        views: { type: Number, default: 0 }
    }

    // widgets: {
    //     col1: [{
    //         widget_type: String
    //     }],
    //     col2: [{
    //         widget_type: String
    //     }],
    //     col3: [{
    //         widget_type: String
    //     }]
    // }
}, { strict: true });


// Useful for Backbone - which uses id
// Add id as a virtual field from _id
// And ensure virtual fields are serialised.
UserSchema.virtual('id').get(function() {
	return this._id.toHexString();
});

UserSchema.virtual('added').get(function() {
    return this._id.getTimestamp();
});

UserSchema.set('toJSON', {
	virtuals: true
});

UserSchema.set('toObject', {
    virtuals: true
});

UserSchema.plugin(passportLocalMongoose);

UserSchema.plugin(search, {
    fields: [
        'firstName',
        'lastName',
        'city',
        'country',
        'career.occupation',
        'skills.occupations',
/*
        'summary',
        'bio',
        'emails',
        'career.awards',
        'skills.accents',
        'skills.languages',
        'skills.performance',
        'skills.athletic',
        'skills.keywords',
        'appearance.height',
        'appearance.weight',
        'appearance.hair',
        'appearance.hairLength',
        'appearance.eyes',
        */
    ]
});

UserSchema.methods.findIncomingInvitesQuery = function() {
  return this.model('Invite').find({ accepted: false, ignored: false, $or:[{ target_user: this._id }, { target_email: { $in: this.emails } }] });
}

UserSchema.methods.findOutgoingInvitesQuery = function() {
  return this.model('Invite').find({ accepted: false, ignored: false, owner: this._id });
}

UserSchema.methods.findContacts = function(cb) {
  return this.model('Contact').find({ owner: this._id }).populate('connection.user').exec(cb);
}

UserSchema.methods.findConnections = function(cb) {
  return this.model('Contact').find({ owner: this._id }).exists('connection.user').populate('connection').exec(cb);
}

UserSchema.methods.getBcardImagePath = function() {
    return config.userfilesDir + '/' + this.username + '/bcard.png';
}

UserSchema.methods.ensureBCardExists = function(cb) {
    // Only generate a business card if it doesn't already exist
    var self = this;
    fs.exists(self.getBcardImagePath(), function(exists) {
        if (exists) {
            cb();
        } else {
            self.saveBCardImg(cb);
        }
    });
}

UserSchema.methods.saveBCardImg = function(cb) {
	var options = {
		screenSize: { width: 447, height: 220 },
		shotSize: { width: 447, height: 'all' },
	}

	var bcardurl = 'http://localhost:3000/api/v1/users/id/' + this._id + '/genbcard';
	var bcardoutput = this.getBcardImagePath();

	try {
		webshot(bcardurl, bcardoutput, options, cb);
	} catch (e) {
		cb(e);
	}
}


UserSchema.methods.safeOut = function() {
	var user = this.toObject();
	delete user.hash;
	delete user.salt;
	user.id = this._id;
	return user;
}

UserSchema.methods.generateVcard = function() {
    var lines = [];

    lines.push('BEGIN:VCARD');
    lines.push('VERSION:2.1');
    lines.push('N:' + this.lastName + ';' + this.firstName);
    lines.push('FN:' + this.firstName + ' ' + this.lastName);
    lines.push('EMAIL:' + this.emails[0]);

    if (this.career && this.career.occupation) {
        lines.push('TITLE:' + this.career.occupation);
    }

    if (this.phone) {
        lines.push('TEL:' + this.phone);
    }

    lines.push('END:VCARD');

    return lines.join('\r\n');
}

UserSchema.methods.generateVcardAttachement = function() {

    var lines = [];

    lines.push('BEGIN:VCARD');
    lines.push('VERSION:2.1');
    lines.push('N:' + this.lastName + ';' + this.firstName);
    lines.push('FN:' + this.firstName + ' ' + this.lastName);
    lines.push('EMAIL:' + this.emails[0]);

    if (this.career && this.career.occupation) {
        lines.push('TITLE:' + this.career.occupation);
    }

    if (this.phone) {
        lines.push('TEL:' + this.phone);
    }

    lines.push('END:VCARD');

    return {
        fileName: (this.firstName + '-' + this.lastName + '-vcard.vcf').replace(/\s+/, '-').replace(/[-]+/, '-').toLowerCase(),
        contentType: 'text/vcard',
        contents: this.generateVcard()
    };
}


UserSchema.methods.populateStatus = function(cb) {

	var _user = this;	//.toObject();

	Async.waterfall([
		function(cb_step){
		// Populate user item with status data
			NewsItem.MongoNewsItem.populate(_user, {
				path:'status',
			}, function(err, user){
				cb_step(err, user);
			});
		},
		function(user, cb_step){
		// Populate user item with status.likes
			NewsItem.MongoLike.populate(user, {
				path:'status.likes',
				model: 'Like',	// Seems to need this to works, despite not being DRY.
//					select: '_id username firstName lastName',
			}, function(err, user){
				cb_step(err, user);
			});
		},
		function(user, cb_step){
		// Populate user item with status.like actors
			NewsItem.MongoLike.populate(user, {
				path:'status.likes.actor',
				model: 'User',	// Seems to need this to works, despite not being DRY.
				select: '_id username firstName lastName',
			}, function(err, user){
				cb_step(err, user);
			});
		},
	], function(err, user) {
		cb(err, user);
	});

}


UserSchema.methods.populateBookEnds = function(contactinfo, req_user, cb) {

	var target = this;	//.toObject();

	Async.parallel([
		function(cb) {
			Bookmark.isBookmarked(req_user._id, target._id, function(err, result) {
				if(err) {
					return cb(err);
				}
				cb(null, result);
			});
		},
		function(cb) {
			UserEndorsement.isEndorsed(req_user._id, target._id, function(err, result) {
				if(err) {
					return cb(err);
				}
				cb(null, result);
			});
		}
	], function(err, results) {

        var res = {
            bookmarked: results[0] ? true : false,
            endorsed: results[1] ? true : false,
            bookmark_notes: results[0] ? results[0].notes : null,
            endorsement_notes: results[1] ? results[1].notes : null,
        }

		cb(err, res);

	});

}


// cb(err)
UserSchema.methods.requestPasswordReset = function(cb) {
	var self = this;

	self.passwordResetRequested	= new Date();
	self.passwordResetCode	= Utils.createUserCode(10);

	self.save(function(err) {
		if(err) {
			return cb(err);
		}

		cb(null);
	});
}


// cb(err, publicError)
UserSchema.methods.checkPasswordReset = function(resetCode, newPassword, cb) {
	var self = this;

	if(!self.passwordResetRequested) {
		return cb(new Error('Client Error'), 'A password reset has not been requested');
	}

	var now = new Date();
	var expireTime = new Date(self.passwordResetRequested.getTime() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);
	if(now > expireTime) {
		return cb(new Error('Client Error'), 'Password reset has expired');
	}

	if(resetCode !== self.passwordResetCode) {
		return cb(new Error('Client Error'), 'Reset code does not match the stored one');
	}

	self.setPassword(newPassword, function(err, self) {
		if(err) {
			return cb(new Error('System Error'), 'Unable to save new password - please try again');
		}

	// Nullify password reset values...
		self.passwordResetRequested	= null;
		self.passwordResetCode	= '';

		self.save(function(err) {
			if(err) {
				return cb(new Error('System Error'), 'Unable to save new password - please try again');
			}

			return cb(null);
		});
	});
}



module.exports = {
	User: mongoose.model('User', UserSchema),
	Representation: mongoose.model('Representation', RepresentationSchema)
};
