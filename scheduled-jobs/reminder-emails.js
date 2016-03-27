var _ = require('underscore'),
    mongoose = require('mongoose'),
    Contact = mongoose.model('Contact'),
    utils = require('./../code/utils');

module.exports = function(agenda) {

    agenda.define('sendReminderEmail', function(job, done) {

        console.log("sendReminderEmail");
        Contact.findOne({ _id: job.attrs.data.contactId }).populate('owner').exec(function(err, contact) {
            if (err || ! contact) {
                utils.logMessage("sendReminderEmail: Unable to find contact");
                utils.logMessage(err);
                utils.logMessage(job);
                done(err);
            } else {
            	if ( ! contact.bcard) {
            		contact.bcard = {};
            	}
                contact.bcard.reminder = Date.now();
                contact.save(function(err2) {
                    if (err2) {
                        utils.logMessage("sendReminderEmail: Unable to upate contact details");
                        utils.logMessage(err2);
                        utils.logMessage(job);
                        done(err2);
                    } else {
                        utils.sendEmail({
                            template: 'reminder',
                            subject: 'You shared your business card',
                            email: contact.owner.emails[0],
                            model: _.extend({ baseUrl: job.attrs.data.baseUrl }, contact.toObject()),
                        }, done
                        );
                    }
                });
            }
        });

    });
}
