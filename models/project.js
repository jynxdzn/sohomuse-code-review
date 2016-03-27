var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    search = require('mongoose-fts'),
    Async = require('async'),
    utils = require('./../code/utils'),
    _ = require('underscore');

var MULTIPLE_EMAIL_WAIT_SECONDS = 10;

var Project = new Schema({

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    }],

    collaboratorsNotified: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    }],

    endorsements: [{
    	user: {
	        type: mongoose.Schema.Types.ObjectId,
	        ref: 'User'
	    },
	    comment: String,
	    approved: { type : Boolean, default: false },
    }],

    photos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }],

    videos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }],

    files: [{
        fileType: String,
        file: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'File'
        },
        added: { type : Date, default : Date.now }
    }],

    isLive: { type : Boolean, default: false },
    isComplete: { type : Boolean, default: false },

    startDate: Date,
    endDate: Date,

    added: { type : Date, default : Date.now },
    title: String,

    requiredRoles: [String],
    userRoles: [String],

    background: String,
    summary: String,
    location: String,

}, { strict: true });

Project.plugin(search, {
    fields: [
        'title',
        'background',
        'summary',
        'requiredRoles'
    ]
});

Project.methods.notifyCollaborators = function(req, user, cb) {

    var self = this;

    self.populate('collaborators', function() {

        if (self.collaborators && self.collaborators.length > 0) {

            // console.log("Checking project collaborators on " + self._id);
            var notified = self.collaboratorsNotified || [];
            // console.log("collaborators already notified:");
            // console.log(notified);

            var recipients = _.filter(self.collaborators, function(contact) {
                var doNotify = (notified.indexOf(contact._id) === -1);
                if (doNotify && contact.target_user && contact.emails && contact.emails.length > 0) {
                    // console.log("collaborator " + contact.target_username + " never notified & got email info. Notifying...");
                    return contact;
                } else {
                    // console.log("collaborator " + contact._id + " " + contact.firstName + " " + contact.lastName + " does not meet notify criteria.");
                    return false;
                }
            });

            Async.eachSeries(recipients, function(recipient, cb_eachseries) {

                sendProjectCollaboratorEmail({
                    baseUrl: req.protocol + '://' + req.headers.host,
                    recipientEmail: recipient.emails[0],
                    project: self,
                    user: user
                }, function(err, cb) {
                    if (err) {
                        return cb_eachseries(err);
                    }

                    notified.push(recipient._id);
                    cb_eachseries(null);

                    // Wait a period of time between each send...
                    setTimeout(function() {
                        cb_eachseries(null);
                    }, MULTIPLE_EMAIL_WAIT_SECONDS * 1000);
                });

            }, function(err) {

                self.collaboratorsNotified = notified;
                self.save(function(err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null);
                });

            });

        } else {
            cb(null);
        }

    });

}

var MongoProject = mongoose.model('Project', Project);

function sendProjectCollaboratorEmail(params, cb) {

    utils.sendEmail({
        template: 'project-collaborator',
        subject: 'You\'ve been added to a project!',
        email: params.recipientEmail,
        model: {
            baseUrl: params.baseUrl,
            project: params.project,
            user: params.user
        },
    }, function(err, responseStatus) {
        if (err) {
            return cb(err);
        }

        cb(null, responseStatus.message);
    });

}

function Migrate(cb) {

    MongoProject.find({}).populate('photos videos').exec(function(err, docs) {

        if (err) {
            console.log(err);
            return cb(err, 0);
        }

        var updatedDocs = 0;

        Async.eachSeries(docs, function(project, cb_project) {

            console.log("* Migrating project " + project._id);
            console.log("Files length is " + project.files.length);

            if ( ! project.photos && ! project.videos) {
                console.log("No photos or videos!");
                return cb_project(null, 0);
            }

            project.files = project.files || [];

            var items = [].concat(project.photos, project.videos);
            console.log("Items length is " + items.length);

            Async.eachSeries(items, function(item, cb_item) {
                project.files.push({
                    fileType: fileTypeFromFile(item),
                    file: item._id
                });
                cb_item(null);
            }, function(err) {

                if (err) {
                    return cb_project(err, 0);
                }

                delete project.photos;
                delete project.videos;

                project.save(function(err, doc, numberAffected) {
                    console.log("Updated project " + project._id);
                    console.log("Files length is " + project.files.length);
                    console.log("...");
                    return cb_project(err, numberAffected);
                });

            });

        }, function(err) {
            cb(err, updatedDocs);
        });

    });

}

function fileTypeFromFile(file) {

    var fileType = 'other';

    // Eugh.
    if (file.isImage) {
        fileType = 'image';
    } else if(file.isAudio) {
        fileType = 'audio';
    } else if (file.isVideo) {
        fileType = 'video';
    } else if (file.isDocument) {
        fileType = 'document';
    }

    return fileType;
}

module.exports = MongoProject;
module.exports.Migrate = Migrate;
