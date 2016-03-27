var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Message = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    added: {type : Date, default : Date.now},
	subject: {type : String, default : ''}, //blank if reply
	body: {type : String, default : ''},
	parentId: {
		type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
	},
	recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
	messageType: {type : String, default : ''}
}, { strict: true });

module.exports = mongoose.model('Message', Message);