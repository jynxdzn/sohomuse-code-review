// TODO: circular dependency between this file and newsitem.js -> Not brilliant!

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
	NewsItem = require('./newsitem'),
	RedisClient = require('./../code/redis-client'),
	Contact = require('./contact'),
	Async = require('async');


/* Functions */

var PAGE_LENGTH = 10;
var STORE_LENGTH = PAGE_LENGTH + 1;		// We deliberately store one more and then throw that away when we return results, so we know whether to page


function getRedisPrefix() {
	return 'news';
}


function getRedisUserKey(user_id) {
	return getRedisPrefix() + ':' + user_id.valueOf();
}



// Returns newsfeed in JSON format, with translations into user locale
// Idea: The frontend should do a pass, so we can supplant items, e.g. actor = {12345, 'Consuelo'} with <a href="user/12345">Consuelo</a>.
// [{
//	'time': (unix format) -> translate to a time on client side (e.g. moment.js)
//	'action': (as below)
//	'actor': {id: 12345, name: 'Consuelo'}
//}, ... {
// }]


function Get(user_id, cb) {
	cb = cb || function(err) {};		// If we don't need the cb
	
	Async.waterfall([
		function(cb_step){
			var meta = {};
			meta.finalPage = true;

			// Pull the update ids from our Redis list...
			// NB lrange 3rd parameter is INCLUSIVE
			RedisClient.Get().lrange(getRedisUserKey(user_id), 0, STORE_LENGTH - 1, function(err, newsItemIds) {				
				if(err) {
					return cb_step(err);
				}
								
				if(newsItemIds.length > 0) {	// We have some values, so no need to rebuild the list...
					if(newsItemIds.length > PAGE_LENGTH) {
						// This is not the final page - knock one from the end of the list...
						meta.finalPage = false;
						newsItemIds.pop();
					}

				// Get the updates associated with these ids from Mongo...
					NewsItem.MongoNewsItem
					.find({ _id: { $in: newsItemIds }})
					.sort({time: -1})
					.populate('actor', '_id username firstName lastName')
					.populate('comments')
					.populate('likes')
					.exec(function(err, newsItems) {
						cb_step(err, newsItems, meta);
					});
				} else {
					// Rebuild our Redis list if it's clearly empty - suggests it might have been corrupted or wiped
					// (NB This will be called too much, but only for brand new users)
					return rebuild(user_id, meta, function(err, newsItems, meta) {
						return cb_step(err, newsItems, meta);
					});			
					
					// Return an empty list -> we've been through everything...
					return cb_step(null, [], meta);
				}
			});
		}, function(newsItems, meta, cb_step) {
			populateNewsItemData(newsItems, function(err, newsItems) {
				cb_step(err, newsItems, meta);
			})
		}, function(newsItems, meta, cb_step) {
			newsItemsToFeed(newsItems, function(err, feed) {
				cb_step(err, feed, meta);
			})
		}
	], function(err, feed, meta) {
		cb(err, feed, meta); 
	});
}


// If the user is scrolling to older newsfeed items, we can send in an until_date to get the next batch of PAGE_LENGTH items.
// We may wish to cache this block for our user?
// before_time should be Date object
function GetHistoric(user_id, before_time, cb) {
	cb = cb || function(err) {};		// If we don't need the cb
	
	Async.waterfall([
		function(cb_step){
			var meta = {};
			meta.finalPage = true;

			NewsItem.MongoNewsItem
			.find()
			.limit(PAGE_LENGTH + 1)	// Pick off one extra so we can work out whether this is the end of the list
			.where('time').lt(before_time)
			.sort({time: -1})
			.populate('actor', '_id username firstName lastName')
			.populate('comments')
			.populate('likes')
			.exec(function(err, newsItems) {			
				if(newsItems.length > PAGE_LENGTH) {
					// This is not the final page - knock one from the end of the list...
					meta.finalPage = false;
					newsItems.pop();
				}
				
				cb_step(err, newsItems, meta);
			});
		}, function(newsItems, meta, cb_step) {
			populateNewsItemData(newsItems, function(err, newsItems) {
				cb_step(err, newsItems, meta);
			})
		}, function(newsItems, meta, cb_step) {
			newsItemsToFeed(newsItems, function(err, feed) {
				cb_step(err, feed, meta);
			})
		}
	], function(err, feed, meta) {
		cb(err, feed, meta); 
	});
}


function populateNewsItemData(newsItems, cb) {
	Async.waterfall([
		function(cb_step) {
			// Build the nested objects (News likes actors)...
			NewsItem.MongoLike.populate(newsItems, {
				path:'likes.actor',
				model: 'User',	// Seems to need this to works, despite not being DRY.
				select: '_id username firstName lastName',
			}, function(err, newsItems){
				cb_step(err, newsItems);
			});
		}, function(newsItems, cb_step) {
			// Build the nested objects (Comments)...
			NewsItem.MongoComment.populate(newsItems, {
				path:'comments.actor',
				model: 'User',	// Seems to need this to works, despite not being DRY.
				select: '_id username firstName lastName',
			}, function(err, newsItems){
				cb_step(err, newsItems);
			});
		}, function(newsItems, cb_step) {
			// Build the nested objects (Comment likes)...
			NewsItem.MongoLike.populate(newsItems, {
				path:'comments.likes',
				model: 'Like',	// Seems to need this to works, despite not being DRY.
			}, function(err, newsItems){
				cb_step(err, newsItems);
			});
		}, function(newsItems, cb_step) {
			// Build the nested objects (Comment like actors)...
			NewsItem.MongoLike.populate(newsItems, {
				path:'comments.likes.actor',
				model: 'User',	// Seems to need this to work, despite not being DRY.
				select: '_id username firstName lastName',
			}, function(err, newsItems){
				cb_step(err, newsItems);
			});
		},
	], function(err, newsItems) {
		cb(err, newsItems);
	});
}	



// cb: err, feed
function newsItemsToFeed(newsItems, cb) {
	var feed = [];
	newsItems.forEach(function(newsItem) {	// Populate the list...
		feed.push({
			id: newsItem._id,
			time: newsItem.time,
			action: newsItem.action,
			actor: newsItem.actor,
			data: newsItem.data,
			comments: newsItem.comments,
			likes: newsItem.likes,
		});
	});

	cb(null, feed);
}


// Push an item into a number of recipients' userfeeds
// newsItemId - the _id of the news item
// recipientIds - an array of _ids...
function Push(newsItemId, recipientIds, cb) {
	cb = cb || function(err) {};		// If we don't need the cb

	recipientIds.forEach(function(user_id) {
		var redis_key = getRedisUserKey(user_id);

		// Push then trim to keep a fixed length..
		// TODO: callbacks for success/failure...
		Async.series([
			function(cb_step) {
				RedisClient.Get().lpush(redis_key, newsItemId, function(err) {
					cb_step(err);
				});
			}, function(cb_step) {
				RedisClient.Get().ltrim(redis_key, 0, STORE_LENGTH, function(err) {
					cb_step(err);
				});
			}
		], function(err) {
			cb(err);
		});
	});

	// NB We could also pub/sub to socket.io notification for specific users here if desired
}



// When a user makes a new contact, we'll want to rebuild their newsfeed to include this contact's information
// This call will drop the redis queue and any associated cached data.

function Uncache(user_id, cb) {
	cb = cb || function(err) {};		// If we don't need the cb

	RedisClient.Get().del(getRedisUserKey(user_id), function(err) {
		cb(err);
	});
}



// If we need to rebuild everyone's data - This could cause a massive activity spike, so probably not a good idea at scale.

function UncacheAll(cb) {
	cb = cb || function(err) {};		// If we don't need the cb

	RedisClient.Get().keys(getRedisPrefix() + ':*', function(err, keys) {
		if(err) {
			return cb(err);
		}

		Async.each(keys, function(item, item_cb) {
			RedisClient.Get().del(item, function(err) {
				item_cb(err);
			});
		}, function(err){
			cb(err);
		});
	});
}



// This is the heavy duty call, if we need to rebuild a feed for user_id...
// cb = function(err, newsItems, meta)
function rebuild(user_id, meta, cb) {
	cb = cb || function(err) {};		// If we don't need the cb

	Async.waterfall([
		function(cb_step) {
			// Find connections - all people that this user follows...
			Contact.find({'owner': user_id})
				.where('connection_date').ne(null)
				.select('target_user')
				.find(function(err, users) {
				if(err) {
					return cb_step(err);
				}

				var connections = [user_id];	// ..include self
				users.forEach(function(user) {
					connections.push(user.target_user);
				});

				cb_step(null, connections);
			});
		}, function(connections, cb_step) {
			// Get news items where user's friends are involved_users
			NewsItem.MongoNewsItem.where('involved_users').in(connections)
				.limit(STORE_LENGTH)	// Pick off one extra so we can work out whether this is the end of the list
				.sort({time: -1})
				.populate('actor', '_id username firstName lastName')
				.populate('comments')
				.populate('likes')
				.exec(function(err, newsItems) {
				if(err) {
					return cb_step(err);
				}
				
				cb_step(null, newsItems);
			});
		}, function(newsItems, cb_step) {
			// Clean out existing list (we shouldn't really be calling this function it if it isn't cleaned out - this is just to be sure...)
			Uncache(user_id, function(err) {
				cb_step(err, newsItems);
			});
		}, function(newsItems, cb_step) {
			// Add these news item to the Redis feed queue for this user...
			// reverse() ensures the most recent is last, so when it's pushed, it'll be at the top of the Redis list
			newsItems.reverse().forEach(function(newsItem) {
				Push(newsItem._id, [user_id]);
			});

			// Page the result...
			meta.finalPage = (newsItems.length > PAGE_LENGTH);
			newsItems = newsItems.slice(0, PAGE_LENGTH);
			cb_step(null, newsItems, meta);
		}
	], function(err, newsItems, meta) {
		cb(err, newsItems, meta);
	});
}



/* Test suite...
var user_id = new mongoose.Types.ObjectId("5344028220b5378746000004");
console.log('User Id' + user_id);
news.uncache(user_id, function(err) {
	console.log('uncache');
	RebuildNewsItems(user_id, function(err) {
		if(err) {
			console.log('RebuildNewsItems - error: ' + err);
		} else {
			console.log('RebuildNewsItems - success');
		}
	});
});
*/


/* Public interface */

module.exports.PAGE_LENGTH = PAGE_LENGTH;
module.exports.Get = Get;
module.exports.GetHistoric = GetHistoric;
module.exports.Push = Push;
module.exports.Uncache = Uncache;
module.exports.UncacheAll = UncacheAll;
