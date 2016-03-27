var mongoose = require('mongoose'),
    middleware = require('./../code/middleware'),
    _ = require('underscore'),
    Notification = mongoose.model('Notification');

module.exports = function(app, passport) {

	function getNotifications(req, method, callback) {
		Notification
		.find({})
		.populate('messageId')
		.populate('fileId')
		.populate('owner')
		.populate('contactId')
		.populate('recipients')
		.where('owner').ne(req.user._id)
		//.where('seen',null)
		.sort({'added': -1})
		.exec(function(err, notifications) {
			//console.log("notifications",notifications);
			if (err) return res.render('500');
			var relevant = new Array();
			notifications.forEach(function(n){
				var recipientIds = _.map(n.recipients, function(data){
					return data._id.toString();
				});
				var seenIds = _.map(n.seen, function(data){
					return data.user.toString();
				});
				if(n.profileChanges){
					return relevant.push(n);
				}
				if(n.fileId && !n.recipients){ //added a new file, notify of this?
					return relevant.push(n);
				}
				if(n.messageId && _.contains(recipientIds, req.user._id.toString()) && !_.contains(seenIds, req.user._id.toString()) ){
					// also check if user is in the seen value
					return relevant.push(_.extend(n.toObject(),{seenbyme:false}));
				}
				if(n.fileId && _.contains(recipientIds, req.user._id.toString()) && !_.contains(seenIds, req.user._id.toString()) ){
					// also check if user is in the seen value
					return relevant.push(_.extend(n.toObject(),{seenbyme:false}));
				}
                // Contact request
                if (n.contactId && n.contactId._id.toString() == req.user._id && !_.contains(seenIds, req.user._id.toString()) ) {
                    return relevant.push(n);
                }
			});
			callback(null, relevant);
		});
	}

	app.get('/api/v1/notifications', middleware.authenticateApi, function(req,res) {
		getNotifications(req,"full",function(err, data) {
			res.send(data);
		});
	});

	app.get('/api/v1/notifications/count', middleware.authenticateApi, function(req,res) {
		getNotifications(req,"count",function(err, data) {
			var counts = {
				message: 0,
				message_seen: 0,
				file: 0,
				file_seen: 0,
				contact: 0,
				contact_seen: 0
			};
			var counted = _.countBy(data, function(r) {
			  if(r.seen.length == 0){
				return r.type;
			  } else {
				return r.type + '_seen';
			  }
			});

			res.send(_.extend(counts,counted));
		});
	});

	app.put('/api/v1/notifications/:id', middleware.authenticateApi, function(req,res) {
		Notification
        .findOne({
            _id: req.params.id
        })
        .exec(function(err, notification) {
            if (err) return res.render('500');

            if(notification.seen){
				notification.seen.push({user:req.user._id,when:Date.now()});
			}else{
				notification.seen = new Array({user:req.user._id,when:Date.now()});
			}

            notification.save(function(err) {
                if (err) {
					res.send({'error':err});
				} else {
					res.send({'success':'Notification updated'});
				}
            });
        });
	});

	app.post('/api/v1/notifications/count', middleware.authenticateApi, function(req,res) {

		Notification
        .update({ seen:null, messageId: {$in:req.body.seenMsgIds} },{ seen: Date.now() },{ multi:true }, function(err){
			if (err) {
				res.send({'error':'An error has occurred'});
			} else {
				res.send({'success':'Notifications updated'});
			}
		});

	});

	app.delete('/api/v1/notifications/:id', middleware.authenticateApi, function(req,res){
		Notification.findById(req.params.id, function (err, notification) {
			if(notification.seen){
				notification.seen.push({user:req.user._id,when:Date.now()});
			}else{
				notification.seen = new Array({user:req.user._id,when:Date.now()});
			}
            notification.save(function(err) {
                if (err) {
                    res.send({'error':'An error has occurred'});
                } else {
                    res.send({'success':'Notification marked as seen'});
                }
            });
		});
	});

}
