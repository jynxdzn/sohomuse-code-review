var mongoose = require('mongoose'),
	Message = mongoose.model('Message'),
	middleware = require('./../code/middleware'),
	_ = require('underscore'),
	User = mongoose.model('User'),
	logger = require('./../code/logger'),
	utils = require('./../code/utils');

module.exports = function(app, passport) {

	app.get('/api/v1/messages', middleware.authenticateApi, function(req,res) {

        var type = req.param('type'),
            skip = req.param('skip'),
            take = req.param('take'),
            or_logic = {},
            sort = req.param('sort') || 'asc',
            query = null;

        switch(type) {
			case 'message':
				opt = { recipients: req.user._id };
				break;
			case 'sent':
				opt = { owner: req.user._id };
				break;
			case 'notsent':
				opt = { owner: { $ne: req.user._id } };
				break;
			case 'messageCollection':
				opt = {recipients: req.user._id };
				or_logic = [{ _id: req.param('parentId') }, { parentId: req.param('parentId') }];
				break;
			default:
				opt = { owner: req.user._id };
				break;
		}

		query = Message.find(opt).or(or_logic);
        query = query.populate('owner recipients', 'username firstName lastName');

        if (sort == 'asc') {
            query = query.sort({ 'added': 1 });
        } else if (sort == 'desc') {
            query = query.sort({ 'added': -1 });
        }

        if (skip) {
            query = query.skip(skip);
        }

        if (take) {
            query = query.limit(take);
        }

        query.exec(function(err, messages) {
		  if (err) return res.render('500');
		  if (type=="messageCollection") 	{
			res.send(messages);
		  } else {

			// couldn't get my head around grouping in mongo, underscore to the rescue
			var MessagesWithLatest = new Array();
			//var ParentsOnly = _.where(messages,{messageType:["message","email"]});
			var ParentsOnly = _.filter(messages, function(msg){
				if(msg.messageType =="message"||msg.messageType == "email"){
					return msg;
				}
			});
			ParentsOnly.forEach(function(message){
				var AllChildren = _.filter(messages, function(msg){
					return msg.parentId == message._id.toString();
				});
				var LatestChild = _.max(AllChildren, function(child){
					return child.added;
				});
				var latestMessageDate = message.added;
				if(AllChildren.length>0){
					latestMessageDate = LatestChild.added;
				}
				message = _.extend(message.toObject(),{latestMessage:LatestChild,latestMessageDate:latestMessageDate});
				MessagesWithLatest.push(message);
			});
			//var MessagesWithLatest = _.sortBy(MessagesWithLatest,function(m) { return -m.get('added').getTime() });
			res.send(MessagesWithLatest);
		  }

		});
	});

	app.post('/api/v1/messages', middleware.authenticateApi, function(req,res) {
		var messageType = req.body.messageType;
		var message = new Message();

		// console.log(messageType);

		if(messageType=='message') {
			message = _.extend(message, req.body, {
				owner:req.user._id
			});
			if(_.indexOf(message.recipients, req.user._id) == -1) {
				message.recipients.push(req.user._id);
			}

			message.save(function(err) {
				if (err) {
					console.log(err);
					res.send({ error: 'An error has occurred' });
				} else {
					sendNotifyEmail(req, messageType, message);
					console.log('saved', message);
					logger.logEntry('message', message,function(data) {
						console.log("Logged", data);
					});
					res.send(message);
				}
			});
		}

		if(messageType == 'reply') {
			Message.findById(req.body.parentId, function(err, data) {
				if (!data) {
					console.log("Parent message was not found, aborting save");
					res.send({'error':'Parent message was not found, aborting save'});
				} else {
					message = _.extend(message, {
						owner:req.user._id,
						body: req.body.body,
						recipients: data.recipients,
						parentId: data._id,
						messageType: messageType,
						subject: data.subject
					});

					message.save(function(err) {
						if (err) {
							//console.log('message reply error',err)
							res.send({'error':'An error has occurred'});
						} else {
							//console.log('message reply saved',message);
							sendNotifyEmail(req, messageType, message);
							logger.logEntry('message',message,function(data) {
								console.log("Logged",data);
							});
							res.send(message);
						}
					});
				}
			});
		}

		if(messageType == 'replyEmail') {
			Message
			.findOne({_id:req.body.parentId}, {emailHeaders: 0})
			.lean()
			.exec(function(err, msg) {
				if (!msg) {
					console.log("Parent message was not found, aborting save");
					res.send({'error':'Parent message was not found, aborting save'});
				} else {
					message = _.extend(message, {
						owner:req.user._id,
						body: req.body.body,
						recipients: msg.recipients,
						parentId: msg._id,
						messageType: 'reply',
						subject: msg.subject,
						emailFrom:msg.emailFrom
					});
					//console.log("msg.emailID",msg.emailID);

					message.save(function(err) {
						if (err) {
							//console.log('message reply error',err)
							res.send({'error':'An error has occurred'});
						} else {
							//console.log('message reply saved',message);
							logger.logEntry('message',message,function(msg) {
								console.log("Logged",msg);
							});

							// send email
							var opt = _.extend({
								messageReply: message.body
							}, req.user.toObject(), {
								baseUrl: req.protocol + '://' + req.headers.host,
							});

							utils.sendEmail({
								template: 'reply',
								baseUrl: req.protocol + '://' + req.headers.host,
								subject: 'Re: ' + message.subject,
								emailFrom: 'SohoMuse <no-reply@sohomuse.com>',      // emailFrom: req.user.emails[0],
								email: msg.emailFrom, //the original sender
								model: opt,
							}, function(err, responseStatus) {
								if (err) {
									console.log(err);
									return;
								}

								console.log("responseStatus.message",responseStatus.message);
								res.send(message);
							});
						}
					});
				}
			});
		}
	});

	function sendNotifyEmail(req, messageType, message) {

		//console.log("sendNotifyEmail");
		//console.log(message);

		var opt = _.extend({
			content: message.body,
            messageId: message._id
		}, req.user.toObject(), {
			baseUrl: req.protocol + '://' + req.headers.host,
		});

		// Get recipients
		_.each(message.recipients, function(rcpt) {

			// Skip the user who sent it
            if (rcpt.equals(req.user._id)) {
                // console.log("Skipping email to self");
                return;
            }

			// Get user
			User.findById(rcpt, function(err, user) {

				// Check the time they were last seen active

				/*var lastSeen = new Date(user.lastSeen).getTime(),
					curTime = new Date().getTime(),
					earliest = curTime - (5 * 60000);		// 5 minutes from now

				if (lastSeen > earliest) {
					console.log("Skipping notification to " + user.emails[0] + " - last seen very recently at " + user.lastSeen);
					return;
				}*/

				utils.sendEmail({
					template: 'message-notification',
					baseUrl: req.protocol + '://' + req.headers.host,
					subject: 'New message notification',
					emailFrom: 'SohoMuse <no-reply@sohomuse.com>',
					email: user.emails[0], //the original sender
					model: opt,
				}, function(err, responseStatus) {
					if (err) {
						console.log(err);
						return;
					}

					console.log("responseStatus.message",responseStatus.message);
				});
			});
		});

	}

}
