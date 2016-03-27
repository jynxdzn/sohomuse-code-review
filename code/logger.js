var _ = require('underscore'),
    mongoose = require('mongoose'),
    Notification = mongoose.model('Notification');

function logEntry(logtype, model) {
    var notification = new Notification();
	notification.owner = model.owner;
	switch(logtype)
	{
		case "profile":
			notification.type = logtype;
			notification.profileChange = true;
			break;
		case "project":
			notification.type = logtype;
			notification.projectChange = model.projectChange;
			break;
		case "message":
			notification.type = logtype;
			notification.messageId = model._id;
			notification.recipients = model.recipients;
			break;
		case "file":
			notification.type = logtype;
			notification.fileId = model._id;
			if(model.recipients.length>0){
				notification.recipients = model.recipients;
			}
			break;
		case "contact":
			notification.type = logtype;
			notification.contactId = model.target_user;
            notification.owner = model.owner;
            notification.inviteId = model._id;
            break;
        case "contactStatus":
            notification.type = "contact";
			notification.inviteId = model._id;       // reference to the invite
            notification.contactId = model.owner;   // tell model.owner their connection request was accepted|ignored by model.target_user
            notification.owner = model.target_user;     // ensure the notification owner is the person who did the accepting/ignoring.
            notification.contactStatus = (model.accepted ? 'accepted' : 'ignored');
			break;
		default:
			return;
	}
	notification.save(function(err) {
		if (err){
			console.log("err",err);
			return;
		} else {
			return "done";
		}
	});
}

module.exports = {
    logEntry: logEntry
};
