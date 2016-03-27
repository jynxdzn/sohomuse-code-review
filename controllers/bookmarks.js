var _ = require('underscore'),
	mongoose = require('mongoose'),
	middleware = require('./../code/middleware'),
	Bookmark = mongoose.model('Bookmark');


module.exports = function(app, passport) {

// Get my bookmarks...
	app.get('/api/v1/bookmarks/me', middleware.authenticateApi, function (req, res) {
		Bookmark.find({
			owner: req.user.id
		})
        .sort('-added')
		.populate('target')
		.exec(function(err, bookmarks) {
			if(err) {
				return res.send({
					status: 'error'
				});
			}

		// Sanitise the output...
			_.each(bookmarks, function(bookmark, key) {
				bookmark.target = bookmark.target.safeOut();
			});

			res.send({
				status: 'ok',
				contacts: bookmarks,
			});
		});
	});


// Add a bookmark for me...
	app.post('/api/v1/bookmarks/me', middleware.authenticateApi, function (req, res) {
        var target_id = req.param('target_id') || null,
            notes = req.param('notes') || null;

        if(!target_id) {
			return res.send({
				status: 'error'
			});
		}

		var bookmark = new Bookmark({
			owner: req.user.id,
			target: target_id,
            notes: notes
		});

		bookmark.save(function(err) {
			if(err) {
				return res.send({
					status: 'error'
				});
			}

			res.send({
				status: 'ok',
				contact: bookmark
			});
		})
	});


// Delete one of my bookmarks...
	app.delete('/api/v1/bookmarks/me', middleware.authenticateApi, function (req, res) {
        var target_id = req.param('target_id') || null;
		if(!target_id) {
			return res.send({
				status: 'error'
			});
		}

		Bookmark.findOneAndRemove({
			owner: req.user.id,
			target: target_id
		}, function(err) {
			if(err) {
				return res.send({
					status: 'error'
				});
			}

			res.send({
				status: 'ok',
			});
		});
	});
}
