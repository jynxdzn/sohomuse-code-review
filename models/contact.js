var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    search = require('mongoose-fts');

var Contact = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    added: { type : Date, default : Date.now },
    firstName: String,
    lastName: String,
    emails: [String],
    phone: String,

    target_user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    target_username: String,

    invite: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invite'
    },

    bcard: {
        code: { type: Number, default: null },
        sent: { type: Date, default: null },
        read: { type: Date, default: null },
        opened: { type: Date, default: null },
        reminder: { type: Date, default: null },
    },

    connection_date: { type: Date, default: null },
    connection_isPrivate: { type: Boolean, default: false },

    location: {
        name: String,
        coord: String
    },
    notes: String,
    tags: [String]

}, { strict: true });

Contact.plugin(search, {
    fields: [
        'firstName',
        'lastName',
        'notes',
        'tags',
        'location.name',
        'target_user.city',
        'target_user.country'
    ]
});

// Making sure that target_username is populated if target_user has value
Contact.pre('save', function (next) {
    var self = this;

    if (this.target_user && !this.target_username) {
        var User = mongoose.model('User');

        User.findOne({ _id: this.target_user}, function (err, user) {
            if (user) {
                self.target_username = user.username;
            }
            next();
        });
    } else {
        next();
    }
});

Contact.methods.setTargetUser = function (user) {
    this.target_user = user._id;
    this.target_username = user.username;
}

Contact.methods.findInvite = function (cb) {
  return this.model('Invite').find({ contact: this._id }).exec(cb);
};

// TODO: cb error return...
function reduceConnectionCount(userId1, userId2, cb) {
    var User = mongoose.model('User');

    User.findOne({ _id: userId1 }, function (err, user1) {
        User.findOne({ _id: userId2 }, function (err, user2) {
            user1.counts.connections--;
            user2.counts.connections--;

            user1.save(function(err) {
                user2.save(function(err) {
                    cb();
                });
            });
        })
    })

}


// TODO: cb error return...
Contact.statics.removeAll = function(contactId, user, cb) {

    var Contact = mongoose.model('Contact'),
        Invite = mongoose.model('Invite'),
        User = mongoose.model('User');

    Contact.findOneAndRemove({ _id: contactId, owner: user._id }, function (err, contact) {
        if (contact && contact.target_user) {
            Contact.findOne({ owner: contact.target_user, target_user: user._id }, function (err, contact2) {

                var inviteId = contact.invite;

                if (contact2) {

                    inviteId = inviteId || contact2.invite;

                    var connected = contact2.connection_date != null;

                    contact2.connection_date = null;
                    contact2.invite = null;


                    var cb2 = function(err) {
                        if (inviteId) {
                            Invite.remove({ _id: inviteId }, cb);
                        } else {
                            cb();
                        }
                    }

                    contact2.save(function(err) {
                        reduceConnectionCount(user._id, contact2.owner, cb2);
                    })
                } else {
                    if (inviteId) {
                        Invite.remove({ _id: inviteId }, cb);
                    } else {
                        cb();
                    }
                }
            });
        } else {
            cb();
        }
    });
};

Contact.methods.generateVcard = function() {
    var lines = [];

    lines.push('BEGIN:VCARD');
    lines.push('VERSION:2.1');
    lines.push('N:' + this.lastName + ';' + this.firstName);
    lines.push('FN:' + this.firstName + ' ' + this.lastName);
    lines.push('EMAIL:' + this.emails[0]);

    if (this.phone) {
        lines.push('TEL:' + this.phone);
    }

    lines.push('END:VCARD');

    return lines.join('\r\n');
}

module.exports = mongoose.model('Contact', Contact);
