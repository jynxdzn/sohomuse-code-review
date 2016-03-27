/* The system should add (and potentially manipulate) news items using this interface
 * It should pull data back using the news interface
 */

var MAX_STATUS_LENGTH = 500;
var MAX_COMMENT_LENGTH = 500;
var ACTION_AGGLUTINATE_MINUTES = 120;	// Time period within which a status will have stuff added to it, rather than creating a new one
var ACTION__STATUS = 'status';
var ACTION__LOCATE = 'locate';
var ACTION__AVAILABILITY = 'availability';
var ACTION__ADD_PICTURES = 'add_pictures';
var ACTION__ADD_VIDEO = 'add_video';
var ACTION__ADD_AUDIO = 'add_audio';
var ACTION__ADD_DOCUMENT = 'add_document';
var ACTION__ADD_PROJECT = 'add_project';
var ACTION__UPDATE_PROJECT = 'update_project';
var ACTION__USERS_CONNECTED = 'users_connected';

var Mongoose = require('mongoose'),
	_ = require('underscore'),
    Schema = Mongoose.Schema,
	News = require('./news'),
	Async = require('async'),
    Contact = Mongoose.model('Contact');


/* Schemata */

var SchemaNewsItem = new Schema({
    time: {type : Date, default : Date.now},
	action: {type : String, default : null},
    actor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
		index: true,
    },
	data: Schema.Types.Mixed,
	involved_users: [Schema.Types.ObjectId],
	comments: [{
		type: Schema.Types.ObjectId,
		ref: 'Comment'
	}],
	likes: [{
        type: Schema.Types.ObjectId,
        ref: 'Like'
    }],
}, { strict: true });


SchemaNewsItem.pre('save', function(next) {
	// Remove any duplicates - can't do simple _.uniq on ObjectIds..
	var involved_users = [];
	_.each(this.involved_users, function(try_user) {
		var foundDuplicate = _.find(involved_users, function(try_existing_user) {
			return _.isEqual(try_user, try_existing_user);
		});

		if(foundDuplicate == undefined) {
			involved_users.push(try_user);
		}
	});
	this.involved_users = involved_users;

	next();
});

var MongoNewsItem = Mongoose.model('NewsItem', SchemaNewsItem);


var SchemaComment = new Schema({
    actor: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    time: {type : Date, default : Date.now},
	data: Schema.Types.Mixed,
	likes: [{
        type: Schema.Types.ObjectId,
        ref: 'Like'
    }],
}, { strict: true });

var MongoComment = Mongoose.model('Comment', SchemaComment);


var SchemaLike = new Schema({
    actor: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    time: {type : Date, default : Date.now},
}, { strict: true });

var MongoLike = Mongoose.model('Like', SchemaLike);


/* Functions */

// Migrates stored data to the latest format...
// NB. This is a little hacky, to cater for lack of migrations - after this has run in production and returns no migrations, then it can be removed...
// cb - function(err, migrateCount)
function Migrate(cb) {
	Async.series([
		function(cb_series) {
			MongoNewsItem.find({action: ACTION__ADD_PICTURES}, function(err, docs) {
				if(err) {
					return cb_series(err, 0);
				}

				var updatedDocs = 0;
				Async.eachSeries(docs, function(newsItem, cb_newsItem) {
					migrateFileIdToFileIds(newsItem, function(err, updatedFlag) {
						if(err) {
							return cb_newsItem(err);
						}

						if(updatedFlag) {
							updatedDocs ++;
						}

						return cb_newsItem(null);
					});
				}, function(err) {
					cb(err, updatedDocs);
				});
			});
		}, function(cb_series) {
			MongoNewsItem.find({action: ACTION__ADD_VIDEO}, function(err, docs) {
				if(err) {
					return cb_series(err, 0);
				}

				var updatedDocs = 0;
				Async.eachSeries(docs, function(newsItem, cb_newsItem) {
					migrateFileIdToFileIds(newsItem, function(err, updatedFlag) {
						if(err) {
							return cb_newsItem(err);
						}

						if(updatedFlag) {
							updatedDocs ++;
						}

						return cb_newsItem(null);
					});
				}, function(err) {
					cb(err, updatedDocs);
				});
			});
		}, function(cb_series) {
			MongoNewsItem.find({action: ACTION__ADD_AUDIO}, function(err, docs) {
				if(err) {
					return cb_series(err, 0);
				}

				var updatedDocs = 0;
				Async.eachSeries(docs, function(newsItem, cb_newsItem) {
					migrateFileIdToFileIds(newsItem, function(err, updatedFlag) {
						if(err) {
							return cb_newsItem(err);
						}

						if(updatedFlag) {
							updatedDocs ++;
						}

						return cb_newsItem(null);
					});
				}, function(err) {
					cb(err, updatedDocs);
				});
			});
		}
	], function(err, migrateCounts) {
		// Add all the values in migrateCounts...
		Async.reduce(migrateCounts, 0, function(accumulator, thisCount, cb_reduce) {
			cb_reduce(null, accumulator + thisCount);
		}, function(err, migrateCountAccumulated){
			return cb(err, migrateCountAccumulated);
		});
	});
}


// cb(err, updatedFlag)
function migrateFileIdToFileIds(newsItem, cb) {
	// If file_id doesn't exist, we've already migrated to a file_ids array
	if(typeof newsItem.data.file_id == 'undefined') {
		return cb(null, 0);
	}

	newsItem.data.file_ids = [newsItem.data.file_id];
	delete newsItem.data.file_id;
	newsItem.markModified('data');

	newsItem.save(function(err, doc, numberAffected) {
		return cb(err, numberAffected);	// numberAffected should be 0 or 1
	});
}


// if err == null, will either return a newsItem to update, or return null (you should create a new one)
// Sometimes we want to update an item; sometimes we'll want to create a new item
// cb(err, newsItem)
function getNewsItemToUpdate(action, actor_id, cb) {
	switch(action) {
		case ACTION__ADD_PICTURES:
		case ACTION__ADD_VIDEO:
		case ACTION__ADD_AUDIO:
		case ACTION__ADD_DOCUMENT:
		case ACTION__UPDATE_PROJECT:
			MongoNewsItem.findOne({
				actor: actor_id,
				action: action,
				time: {"$gte": new Date(Date.now() - ACTION_AGGLUTINATE_MINUTES * 60000)}	// Find anything recent
			}).sort({time: -1}).exec(function(err, result) {
				if(result) {
					result.time = Date.now();	// Update the timestamp
					result.markModified('data');
				}

				cb(err, result);
			});
		break;

		default:
			cb(null, null);
	}
}


// ACTION_DATA must suit the formats specified above, and usually include actor (though by making it non-mandatory, there's scope for global notices / adverts??)

// This has some embedded logic
// - If a user adds multiple photos/videos, they'll accumulate under a single news item.
// - (Potentially) Prevent multiple news updates from the same person in a short period, if that's annoying

function Add(action, actor_id, action_data, cb) {
	// Search for recent items, and if we can match this type if it's an add picture, video or audio
	getNewsItemToUpdate(action, actor_id, function(err, newsItem) {
		if(err) {
			return cb(err);
		}

		var isNewNews = false;
		if(!newsItem) {
			newsItem = new MongoNewsItem();
			isNewNews = true;
		}

		if(typeof newsItem.data == 'undefined') {
			newsItem.data = {};
		}

	// TODO: Check and sanitise, dependent on type...
		switch(action) {
			case ACTION__STATUS: {
				newsItem.action = action;
				newsItem.actor = actor_id;
				newsItem.data.text = action_data.text.trim();

				if(newsItem.data.text == "") {
					return cb(new Error('No status text'));
				} else if(newsItem.data.text.length > MAX_STATUS_LENGTH) {
					return cb(new Error('Status text is too long (maximum ' + MAX_STATUS_LENGTH + ' characters'));
				}

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__LOCATE: {
				newsItem.actor = actor_id;
				var latlng = {lat: (action_data.lat || null), lng: (action_data.lng || null)};
				var geo = (latlng.lat && latlng.lng) ? latlng : null;

				newsItem.data.location_name = action_data.location_name;
				newsItem.data.geo = geo;

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__AVAILABILITY: {
				newsItem.actor = actor_id;
				newsItem.data.available = action_data.available;

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__ADD_PICTURES: {
				newsItem.actor = actor_id;
				newsItem.data.file_ids = newsItem.data.file_ids || [];
				newsItem.data.file_ids.push(action_data.file_id);

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__ADD_VIDEO: {
				newsItem.actor = actor_id;
				newsItem.data.file_ids = newsItem.data.file_ids || [];
				newsItem.data.file_ids.push(action_data.file_id);

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__ADD_AUDIO: {
				newsItem.actor = actor_id;
				newsItem.data.file_ids = newsItem.data.file_ids || [];
				newsItem.data.file_ids.push(action_data.file_id);

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__ADD_DOCUMENT: {
				newsItem.actor = actor_id;
				newsItem.data.file_ids = newsItem.data.file_ids || [];
				newsItem.data.file_ids.push(action_data.file_id);

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__ADD_PROJECT: {
				newsItem.actor = actor_id;
				newsItem.data.project_id = action_data.project_id;
				newsItem.data.title = action_data.title;
                newsItem.data.summary = action_data.summary;
				newsItem.data.requiredRoles = action_data.requiredRoles;

				newsItem.involved_users.push(actor_id);
			}; break;

			case ACTION__UPDATE_PROJECT: {
				newsItem.actor = actor_id;
				newsItem.data.project_id = action_data.project_id;
				newsItem.data.title = action_data.title;

				newsItem.involved_users.push(actor_id);
			}; break;
			
			// NB Only send this notification once; not once for each user
			case ACTION__USERS_CONNECTED: {
				newsItem.actor = actor_id;
				newsItem.data.userId = action_data.userId;
				newsItem.data.userUsername = action_data.userUsername;
				newsItem.data.userFirstName = action_data.userFirstName;
				newsItem.data.userLastName = action_data.userLastName;

				newsItem.involved_users.push(actor_id);
				newsItem.involved_users.push(action_data.userId);
			}; break;

			default: {
				return cb(new Error("Unexpected news item type"), null);
			}; break;
		}

		newsItem.action = action;

		newsItem.save(function(err) {
			// NB: Unusual pattern - we call our callback early...
			cb(err, newsItem);

			// ...because... it isn't critical if this fails (but we should log it if so)...
			if(isNewNews) {
				propagateNewsItemToUserFeeds(newsItem);
			}
		});
	});
}



// We send our news item into the relevant contact feeds, dependent on newsItem action type...
function propagateNewsItemToUserFeeds(newsItem) {
	// Get the contacts for these actors...
	// (NB could be extended to friends-of-friends and/or those in a specific location)
	// Also includes the actors themselves!

	// Build a recipient list (i.e. all users that have this user as a target, and are connected)...
	Contact
	.where('target_user')
	.in(newsItem.involved_users)
	.where('connection_date').ne(null)
	.select('owner')
	.find(function(err, users) {
		if(err) {
			console.log(err);
			return;
		}

		var recipients = newsItem.involved_users;

		// Ensure we don't get duplicates...
		// [NB this may well be suboptimal]
		users.forEach(function(interestedUser) {
			if(recipients.indexOf(interestedUser.owner) == -1) {	// New item, so add it
				recipients.push(interestedUser.owner);
			}
		});

		// Add the news item to the Redis feed queue for each of these contacts
		News.Push(newsItem._id, recipients);
	});
}



// TODO: Validate 'text' field
// TODO: Check for duplicate data from the same user?
function AddComment(parent_id, actor_id, action_data, cb) {
	// TODO: Sanitise parent_id?

	var commentText = action_data.text.trim();

	if(commentText == "") {
		return cb(new Error('No status text'));
	} else if(commentText.length > MAX_COMMENT_LENGTH) {
		return cb(new Error('Comment is too long (maximum ' + MAX_COMMENT_LENGTH + ' characters'));
	}

	Async.waterfall([
		function(cb_step){
		// Grab the parent news item...
			MongoNewsItem
			.findOne({ _id: Mongoose.Types.ObjectId(parent_id)})
			.exec(function(err, newsItem) {
				cb_step(err, newsItem);
			});
		},
		// [TODO: Check authority to comment on this news item (i.e. is friend of this user?)]
		function(newsItem, cb_step){
		// Create the comment...
			var comment = new MongoComment();
			comment.actor = actor_id;
			comment.data = {
				text: commentText
			};

			comment.save(function(err) {
				cb_step(err, newsItem, comment);
			});
		},
		function(newsItem, comment, cb_step){
		// Add to news item and save... (SHOULDDO: Check - is this an edge case- possible race condition?)
			newsItem.comments.push(comment._id);
			newsItem.save(function(err) {
				cb_step(err, comment);
			});
		},
	], function(err, comment) {
		// TODO: Propagate notifications?
		// COULDDO: Add involved_users, for tagging individual users
		cb(err, comment);
	});
}



// Parameters:
// @id [string]
// @actor_id [MongoId]
function Like(id, actor_id, cb) {
	Async.waterfall([
		function(cb_step) {
		// Grab the news item...
			MongoNewsItem
			.findOne({ _id: Mongoose.Types.ObjectId(id)})
			.populate('likes')
			.exec(function(err, newsItem) {
				cb_step(err, newsItem);
			});
		},
		// [TODO: Check authority to like this news item (i.e. is friend of this user?)]
		function(newsItem, cb_step) {
		// Ensure a like is not already registered for this user
			var isDuplicate = newsItem.likes.some(function(like) {
				return like.actor.equals(actor_id);
			});

			if(isDuplicate) {
				return cb_step(new Error('You have already liked this'));
			}

			cb_step(null, newsItem);
		},
		function(newsItem, cb_step) {
		// Create the like...
			var like = new MongoLike();
			like.actor = actor_id;

			like.save(function(err) {
				cb_step(err, newsItem, like);
			});
		},
		function(newsItem, like, cb_step){
		// Add to news item and save... (SHOULDDO: Check - is this an edge case- possible race condition?)
			newsItem.likes.push(like._id);
			newsItem.save(function(err) {
				cb_step(err, like);
			});
		},
	], function(err, like) {
		// TODO: Propagate notifications?
		// COULDDO: Add involved_users, for tagging individual users
		cb(err, like);
	});
}


// TODO: Potential for race conditions...
function Unlike(id, actor_id, cb) {
	Async.waterfall([
		function(cb_step) {
		// Grab the news item...
			MongoNewsItem
			.findOne({ _id: Mongoose.Types.ObjectId(id)})
			.populate('likes')
			.exec(function(err, newsItem) {
				cb_step(err, newsItem);
			});
		},
		function(newsItem, cb_step) {
		// Remove this user's like from the list...
			newsItem.likes = newsItem.likes.filter(function(like) {
				return !like.actor.equals(actor_id);
			});

			newsItem.save(function(err) {
				cb_step(err, newsItem);
			});
		},
	], function(err, newsItem) {
		cb(err, newsItem);
	});
};


function CommentLike(id, actor_id, cb) {
	Async.waterfall([
		function(cb_step){
		// Grab the item...
			MongoComment
			.findOne({ _id: Mongoose.Types.ObjectId(id)})
			.populate('likes')
			.exec(function(err, comment) {
				cb_step(err, comment);
			});
		},
		// [TODO: Check authority to like this news item (i.e. is friend of this user?)]
		function(comment, cb_step) {
		// Ensure a like is not already registered for this user
			var isDuplicate = comment.likes.some(function(like) {
				return like.actor.equals(actor_id);
			});

			if(isDuplicate) {
				return cb_step(new Error('You have already liked this'));
			}

			cb_step(null, comment);
		},
		function(comment, cb_step){
		// Create the like...
			var like = new MongoLike();
			like.actor = actor_id;

			like.save(function(err) {
				cb_step(err, comment, like);
			});
		},
		function(comment, like, cb_step){
		// Add to news item and save... (SHOULDDO: Check - is this an edge case- possible race condition?)
			comment.likes.push(like._id);
			comment.save(function(err) {
				cb_step(err, like);
			});
		},
	], function(err, like) {
		// TODO: Propagate notifications?
		// COULDDO: Add involved_users, for tagging individual users
		cb(err, like);
	});
}


// TODO: Potential for race conditions...
function CommentUnlike(id, actor_id, cb) {
	Async.waterfall([
		function(cb_step) {
		// Grab the item...
			MongoComment
			.findOne({ _id: Mongoose.Types.ObjectId(id)})
			.populate('likes')
			.exec(function(err, comment) {
				cb_step(err, comment);
			});
		},
		function(comment, cb_step) {
		// Remove this user's like from the list...
			comment.likes = comment.likes.filter(function(like) {
				return !like.actor.equals(actor_id);
			});

			comment.save(function(err) {
				cb_step(err, comment);
			});
		},
	], function(err, comment) {
		cb(err, comment);
	});
};

/* Public interface */

module.exports.ACTION__STATUS = ACTION__STATUS;
module.exports.ACTION__LOCATE = ACTION__LOCATE;
module.exports.ACTION__AVAILABILITY = ACTION__AVAILABILITY;
module.exports.ACTION__ADD_PICTURES = ACTION__ADD_PICTURES;
module.exports.ACTION__ADD_VIDEO = ACTION__ADD_VIDEO;
module.exports.ACTION__ADD_AUDIO = ACTION__ADD_AUDIO;
module.exports.ACTION__ADD_DOCUMENT = ACTION__ADD_DOCUMENT;
module.exports.ACTION__ADD_PROJECT = ACTION__ADD_PROJECT;
module.exports.ACTION__UPDATE_PROJECT = ACTION__UPDATE_PROJECT;
module.exports.ACTION__USERS_CONNECTED = ACTION__USERS_CONNECTED;
module.exports.MAX_STATUS_LENGTH = MAX_STATUS_LENGTH;
module.exports.MAX_COMMENT_LENGTH = MAX_COMMENT_LENGTH;
module.exports.MongoNewsItem = MongoNewsItem;
module.exports.MongoComment = MongoComment;
module.exports.MongoLike = MongoLike;
module.exports.Add = Add;
module.exports.AddComment = AddComment;
module.exports.Like = Like;
module.exports.Unlike = Unlike;
module.exports.CommentLike = CommentLike;
module.exports.CommentUnlike = CommentUnlike;
module.exports.Migrate = Migrate;
