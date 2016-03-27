var _ = require('underscore'),
	mongoose = require('mongoose'),
	middleware = require('./../code/middleware'),
    User = mongoose.model('User'),
	UserEndorsement = mongoose.model('UserEndorsement');


module.exports = function(app, passport) {


// Get endorsements of :username (list of people who have endorsed :username)
    app.get('/api/v1/user-endorsements/username/:username', function(req, res) {

        var output = [];

        User.findByUsername(req.param('username'), function(err, user) {
            if (user) {
                UserEndorsement.find({
                    target: user._id
                })
                .populate('owner', '_id username firstName lastName city locationName summary counts bcard career country')
                .exec(function(err, userEndorsements) {

                    if (err) {
                        return res.send({
                            status: 'error'
                        });
                    }

                    _.each(userEndorsements, function(endorsement) {
                        output.push(_.extend({}, endorsement.owner.toObject(), {
                            notes: endorsement.notes,
                            added: endorsement.added
                        }));
                    });

                    res.send(output);
                });
            }
        });
    });


// Get my endorsements...
	app.get('/api/v1/user-endorsements/me', middleware.authenticateApi, function (req, res) {
		UserEndorsement.find({
			owner: req.user.id
		})
		.populate('target')
		.exec(function(err, userEndorsements) {
			if(err) {
				return res.send({
					status: 'error'
				});
			}

		// Sanitise the output...
			_.each(userEndorsements, function(userEndorsement, key) {
				userEndorsement.target = userEndorsement.target.safeOut();
			});

			res.send({
				status: 'ok',
				contacts: userEndorsements,
			});
		});
	});


// Add an endorsement for me...
	app.post('/api/v1/user-endorsements/me', middleware.authenticateApi, function (req, res) {
        var target_id = req.param('target_id') || null,
            notes = req.param('notes');

        if(!target_id) {
			return res.send({
				status: 'error'
			});
		}

		var userEndorsement = new UserEndorsement({
			owner: req.user.id,
			target: target_id,
            notes: notes
		});

		userEndorsement.save(function(err) {
			if(err) {
				return res.send({
					status: 'error'
				});
			}

			res.send({
				status: 'ok',
				contact: userEndorsement
			});
		})
	});


// Delete one of my endorsements...
	app.delete('/api/v1/user-endorsements/me', middleware.authenticateApi, function (req, res) {
        var target_id = req.param('target_id') || null;
		if(!target_id) {
			return res.send({
				status: 'error'
			});
		}

		console.log(req.user.id);
		console.log(target_id);
		UserEndorsement.findOneAndRemove({
			owner: req.user.id,
			target: target_id
		}, function(err, removed) {
			console.log(removed);

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
