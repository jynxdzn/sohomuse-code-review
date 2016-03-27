var middleware = require('./../code/middleware'),
	News = require('./../models/news'),
	NewsItem = require('./../models/newsitem');


module.exports = function(app, passport) {

// Returns news in JSON format, with translations into user locale
// Idea: The frontend should do a pass, so we can supplant items, e.g. actor = {12345, 'Consuelo'} with <a href="user/12345">Consuelo</a>.
// [{
//	'time': (unix format) -> translate to a time on client side (e.g. moment.js)
//	'action': (as below)
//	'actor': {id: 12345, name: 'Consuelo'}
//}, ... {
// }]


// Params:
//	before_time - Get stuff from before this time (can be null, empty, or UTC string)
// TODO: May duplicate stuff that happens on the same second. Suggest being inclusive with the time and filtering on the view for duplicates
	app.get('/api/v1/news', middleware.authenticateApi, function(req, res) {

	// Get the before_time parameter if it exists...
		var before_time = null;
		if(req.param('before_time')) {
			before_time = req.param('before_time');
		
		// UTC time will be like: 2014-08-20T10:00:27.411Z
			var matchResult = before_time.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z/);	// Pick off the time value from the front of the string
			if(!matchResult) {
				before_time = null;
			} else {
				before_time = new Date(matchResult[1], matchResult[2] - 1, matchResult[3], matchResult[4], matchResult[5], matchResult[6], matchResult[7]);
			}
		}
		
		if(!before_time) {	// No timestamp requested- just get the first batch
			News.Get(req.user._id, function(err, newsItems, meta) {
				if(err) {
					return res.send({error: 'An error has occurred'});
				}

				try {
					res.json({
						meta: meta,
						newsItems: newsItems
					});
				} catch(e) {
					res.send({ error: 'An exception has been caught' });
				}
			});		
		} else {	// Timestamp requested = get historic
			News.GetHistoric(req.user._id, before_time, function(err, newsItems, meta) {
				if(err) {
					return res.send({error: 'An error has occurred'});
				}

				try {
					res.json({
						meta: meta,
						newsItems: newsItems
					});
				} catch(e) {
					res.send({ error: 'An exception has been caught' });
				}
			});
		}
	});


    app.post('/api/v1/news-comment', middleware.authenticateApi, function (req, res) {
		var parent_id = req.body.parent_id || null;

		NewsItem.AddComment(parent_id, req.user._id, {
			text: req.body.text
		}, function(err, comment) {
			if(err) {
				return res.send({error: 'Comment could not be added'});
			}

			res.send({success: 'Comment added'});
		});
	});


    app.post('/api/v1/news/like', middleware.authenticateApi, function (req, res) {
		var id = req.body.id || null;

		NewsItem.Like(id, req.user._id, function(err, comment) {
			if(err) {
				return res.send({error: 'Like could not be added'});
			}

			res.send({success: 'Like added'});
		});
	});


    app.post('/api/v1/news/unlike', middleware.authenticateApi, function (req, res) {
		var id = req.body.id || null;

		NewsItem.Unlike(id, req.user._id, function(err, comment) {
			if(err) {
				return res.send({error: 'Like could not be removed'});
			}

			res.send({success: 'Like removed'});
		});
	});



    app.post('/api/v1/news-comment/like', middleware.authenticateApi, function (req, res) {
		var id = req.body.id || null;

		NewsItem.CommentLike(id, req.user._id, function(err, comment) {
			if(err) {
				return res.send({error: 'Like could not be added'});
			}

			res.send({success: 'Like added'});
		});
	});


    app.post('/api/v1/news-comment/unlike', middleware.authenticateApi, function (req, res) {
		var id = req.body.id || null;

		NewsItem.CommentUnlike(id, req.user._id, function(err, comment) {
			if(err) {
				return res.send({error: 'Like could not be removed'});
			}

			res.send({success: 'Like removed'});
		});
	});

/*
	app.get('/api/v1/news/historic', middleware.authenticateApi, function(req,res) {
		News.GetHistoric(req.user._id, req.param('toTime'), function(err, news) {
			if(err) {
				return res.send({'error':'An error has occurred'});
			}

			res.json(news);
		});
	});
*/
}
