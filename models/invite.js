var mongoose = require('mongoose'),
	Async = require('async'),
	_ = require('underscore'),
    NewsItem = require('./../models/newsitem'),
    Schema = mongoose.Schema,
	utils = require('./../code/utils'),
    search = require('mongoose-fts');

var MULTIPLE_EMAIL_WAIT_SECONDS = 10;

var Invite = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    code: { type : Number, default : function() { return new Date().getTime(); } },
    date: { type : Date, default : Date.now },
    accepted: { type : Boolean, default: false },
    accepted_date: Date,
    ignored: { type : Boolean, default: false },
    ignored_date: Date,

    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },

    target_email: String,
    target_user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { strict: true });

Invite.statics.revoke = function (inviteId, user, cb) {

    var Contact = mongoose.model('Contact'),
        Invite = mongoose.model('Invite');

    Invite.findOneAndRemove({ _id: inviteId, owner: user._id }, function (err, invite) {
        Contact.findOne({ _id: invite.contact }, function (err, contact) {
            contact.invite = null;
            contact.save(cb);
        });
    });
}

Invite.methods.accept = function(req, user, cb) {
    var User = this.model('User'),
        Contact = this.model('Contact');

    this.accepted = true;
    this.accepted_date = new Date();

    var self = this;

    User.findOne({ _id: self.owner }, function (err, owner) {
        Contact.findOne({ _id: self.contact }, function (err, contact) {

            contact.setTargetUser(user);

            contact.connection_date = new Date();
            contact.connection_isPrivate = user.privateProfile;

            var contact2 = new Contact({
                owner: user._id,
                firstName: owner.firstName,
                lastName: owner.lastName,
                emails: owner.emails,
                connection_date: contact.connection_date,
                connection_isPrivate: owner.privateProfile
            });

            contact2.setTargetUser(owner);

            owner.counts.connections++;
            user.counts.connections++;

		// Save all the data..
			Async.parallel([
				function(cb_parallel){
					self.save(function(err) {
						cb_parallel(err);
					});
				}, function(cb_parallel){
					contact.save(function(err) {
						cb_parallel(err);
					});
				}, function(cb_parallel){
					contact2.save(function(err) {
						cb_parallel(err);
					});
				}, function(cb_parallel){
					owner.save(function(err) {
						cb_parallel(err);
					});
				}, function(cb_parallel){
					user.save(function(err) {
						cb_parallel(err);
					});
				}
			], function(err, results){
				if(err) {
					return cb(err);
				}

			// All saving succeeded - now propagate notifications to contacts of both users...
				NewsItem.Add(NewsItem.ACTION__USERS_CONNECTED, owner._id, {
					userId: user._id,
					userUsername: user.username,
					userFirstName: user.firstName,
					userLastName: user.lastName
				}, function(err, item) {
					// (Ignore any error) #TODO: Log
				});

				var ownerFullName = [owner.firstName, owner.lastName].join(' ');
				var userFullName = [user.firstName, user.lastName].join(' ');
				emailFriendsAboutConnection(req, Contact, owner._id, ownerFullName, user._id, userFullName, function(err) {	// NB - sending Contact model through. Not ideal, but quickest fix for dependencies
					// (Ignore any error) #TODO: Log
				});

			// NB Unusual pattern, but the notifications are non-critical, so we can callback without waiting for their callbacks...
				cb(null);
			});
        });
    });
}


// cb(err)
function emailFriendsAboutConnection(req, Contact, connecting1Id, connecting1Name, connecting2Id, connecting2Name, cb) {
	Async.waterfall([
		function(cb_waterfall){
			// Find connections of both users

//			console.log('Connecting1: ' + connecting1Id);
//			console.log('Connecting2: ' + connecting2Id);

			Contact
			.where('target_user')
			.in([connecting1Id, connecting2Id])
			.where('connection_date').ne(null)
			.select('owner')
			.populate('owner')
			.find(function(err, contacts) {
				if(err) {
					return cb_waterfall(err);
				}

			// Get users from contacts...
				var users = _.map(contacts, function(contact) {
                    if (contact && contact.owner) {
					   return contact.owner;
                    }
				});

				return cb_waterfall(null, users);
			});
		}, function(users, cb_waterfall) {
			// Sanitise recipients:
			//   De-duplicate the list
			//   Remove both actor ids
			// [NB this may well be suboptimal]
			var recipientIds = [];	// Just for keeping track of duplicates
			var recipients = _.filter(users, function(user) {
                if (user && user._id) {

    				// Skip the two actors..
    				if(user._id.equals(connecting1Id) || user._id.equals(connecting2Id)) {
    					// console.log('skipping (actor): ' + user._id);
    					return false;
    				}

    				if(recipientIds.indexOf(user._id.toString()) != -1) {
    					// Already been added, so skip..
    					// console.log('skipping (already added): ' + user._id);
    					return false;
    				}

    				recipientIds.push(user._id.toString());

                    //console.log('Adding! ' + user._id);
    				return true;
                } else {
                    console.log("Did NOT get a user ID!");
                    console.log(user);
                }

			});

			cb_waterfall(null, recipients);
		}, function(recipients, cb_waterfall) {
		// Send out emails; do this in series to keep rate down (may trip spam measures)...
			Async.eachSeries(recipients, function(recipient, cb_eachseries) {
				sendUserConnectionEmail({
					baseUrl: req.protocol + '://' + req.headers.host,
					recipientName: recipient.firstName,
					recipientEmail: recipient.emails[0],
					connecting1Name: connecting1Name,
					connecting2Name: connecting2Name,
				}, function(err, cb) {
					if(err) {
						return cb_eachseries(err);
					}

					// Wait a period of time between each send...
					setTimeout(function() {
						cb_eachseries(null);
					}, MULTIPLE_EMAIL_WAIT_SECONDS * 1000);
				});
			}, function(err) {
				cb_waterfall(err);
			});
		}
	], function(err) {
		cb(err);
	});
}


function sendUserConnectionEmail(params, cb) {
	utils.sendEmail({
		template: 'users-connected',
		subject: 'Someone you know has made a connection!',
		email: params.recipientEmail,
		model: {
			baseUrl: params.baseUrl,
			recipientName: params.recipientName,
			connecting1Name: params.connecting1Name,
			connecting2Name: params.connecting2Name,
		},
	}, function(err, responseStatus) {
		if (err) {
			return cb(err);
		}

		cb(null, responseStatus.message);
	});
}


function sendInviteEmail(req, contact, cb) {

		var invite = contact.invite;

		var opt = _.extend({
			city: '',
			country: '',
			career: '',
			representation: '',
			social: '',
			bcard: '',
		}, req.user.toObject(), {
			contact: contact,
			baseUrl: req.protocol + '://' + req.headers.host,
			inviteId: invite._id,
			inviteCode: invite.code,
		});

		req.user.ensureBCardExists(function(ee) {
	});
}




Invite.methods.ignore = function (user, cb) {
    this.ignored = true;
    this.save(cb);
}

module.exports = mongoose.model('Invite', Invite);
