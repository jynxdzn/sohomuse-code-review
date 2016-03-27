var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Notification = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    added: {type : Date, default : Date.now},
	type: {type : String, default : null},
	profileChange: {type : String, default : null},
	fileId: {
		type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
	},
	messageId: {
		type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
	},
	recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
	contactId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    inviteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invite'
    },
	contactStatus:{
		type: String,
		default : 'new'
	},
	seen: [{
		user:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		when:{
			type : Date,
			default : null
		}
	}]
}, { strict: true });

module.exports = mongoose.model('Notification', Notification);
