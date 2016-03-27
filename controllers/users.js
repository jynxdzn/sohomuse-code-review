var _ = require('underscore'),
    middleware = require('./../code/middleware'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Contact = mongoose.model('Contact'),
    Bookmark = mongoose.model('Bookmark'),
    UserEndorsement = mongoose.model('UserEndorsement'),
    rest = require('restler'),
    utils = require('./../code/utils'),
    config = require('./../config'),
	Async = require('async'),
    NewsItem = require('./../models/newsitem');


module.exports = function(app, passport) {
    app.get('/api/v1/users', middleware.authenticateApi, function (req, res) {
        var query = req.param('q') ? User.search(req.param('q')) : User.find();

        query
        .where('privateProfile').ne(true)
        .where('username').ne('')
        .sort('counts.connections')
        .exec(function(err, results) {
            if (err) throw err;

            res.send(results);
        });
    });


    app.get('/api/v1/users/nearby', middleware.authenticateApi, function (req, res) {
        var query = req.param('q') ? User.search(req.param('q')) : User.find();

        query
        .where('privateProfile').ne(true)
        .sort('counts.connections')
        .exec(function(err, results) {
            if (err) throw err;

            res.send(results);
        });
    });


	app.get('/api/v1/users/me', middleware.authenticateApi, function(req, res) {
		console.log('GET');
		console.log(req.body);

		Async.waterfall([
			function(cb_step){
			// Populate user item with status data
				NewsItem.MongoNewsItem.populate(req.user, {
					path:'status',
				}, function(err, user){
					cb_step(err, user);
				});
			},
			function(user, cb_step){
			// Populate user item with status.likes
				NewsItem.MongoLike.populate(user, {
					path:'status.likes',
					model: 'Like',	// Seems to need this to works, despite not being DRY.
//					select: '_id username firstName lastName',
				}, function(err, user){
					cb_step(err, user);
				});
			},
			function(user, cb_step){
			// Populate user item with status.like actors
				NewsItem.MongoLike.populate(user, {
					path:'status.likes.actor',
					model: 'User',	// Seems to need this to works, despite not being DRY.
					select: '_id username firstName lastName',
				}, function(err, user){
					cb_step(err, user);
				});
			},
		], function(err, user) {
			if(err) {
				return res.send({error: 'Unable to get user'});
			}

			res.send(user.safeOut());
		});
	});


	app.put('/api/v1/users/me', middleware.authenticateApi, function (req, res) {
		var user = req.user;

		var fields = [
			'firstName',
			'lastName',
			'summary',
			'bio',
			'career',
			'city',
			'country',
			'emails',
			'skype',
			'phone',
			'occupation',
			'awards',
			'skills',
			'appearance',
			'social',
			'representation',
		];

		fields.forEach(function(field) {
			if(typeof req.body[field] !== 'undefined') {
				user[field] = req.body[field];
			}
		});

		// TODO: This is a bit hacky...
		if(req.body['bcard']['img']) {
			user.bcard.img = req.body['bcard']['img'];
		}

		Async.waterfall([
			function(cb_step) {
				// Ensure index is updated (mongoose-fts didn't seem to be picking up changes inside objects (like career/skills))
				user.updateIndex();
				user.save(function(err) {
					cb_step(err, user);
				});
			},
			function(user, cb_step) {
				Contact.update(
					{ target_user: user._id },
					{ $set: { connection_isPrivate: user.privateProfile, emails: user.emails }
				}, function(err) {
					cb_step(err, user);
				})
			},
			function(user, cb_step) {
				user.saveBCardImg(function(err) {
					cb_step(err, user);
				});
			},
		], function(err) {
			if(err) {
				return res.send(err);
			}

			console.log('PUT -> returned');
			console.log(user);
			res.send(user);
		});
    });


	app.patch('/api/v1/users/me', middleware.authenticateApi, function (req, res) {
		var user = req.user;

		var updates = {};
		if(typeof(req.body.bgimage) != undefined) {
			updates.bgimage = req.body.bgimage;
		}

		User.update({_id: user._id}, updates, {}, function(err, affectedCount) {
			if(err) {
				return res.send({'error':'Profile could not be updated'});
			}

			res.send({'success': 'Profile updated'});
		});
	});


    app.post('/api/v1/users/me/status', middleware.authenticateApi, function (req, res) {
		NewsItem.Add(NewsItem.ACTION__STATUS, req.user._id, {
			text: req.body.text
		}, function(err, item) {
            if(err) {
				return res.send({'error':'Status could not be updated'});
			}

			// Update this user's most recent status on their profile
			req.user.status = item._id;
			req.user.save(function(err) {
				if(err) {
					return res.send({'error':'Status could not be updated'});
				}

				res.send({'success':'Status updated', 'newsitem': item});
			});
        });
	});


    app.put('/api/v1/users/me/location', middleware.authenticateApi, function (req, res) {
        NewsItem.Add(NewsItem.ACTION__LOCATE, req.user._id, {
            location_name: req.body.location_name
        }, function(err, item) {
            if(err) {
                return res.send({'error':'Location could not be updated'});
            }

            if (req.user && req.body.location_name.length > 0) {
                // If location is present, update this user's copy of the location for displaying on profile
                User.findByUsername(req.user.username, function(err, user) {
                    if ( ! err && user) {
                        user.locationName = req.body.location_name;

                        if (req.body.latlng) {
                            user.geo = [ parseFloat(req.body.latlng.lng), parseFloat(req.body.latlng.lat) ];
                        }

                        user.save();
                    }
                });
            }

            res.send({'success':'Location updated'});
        });
    });


    app.put('/api/v1/users/me/availability', middleware.authenticateApi, function (req, res) {

        var available = (req.body.available == 'true') ? true : false;

		NewsItem.Add(NewsItem.ACTION__AVAILABILITY, req.user._id, {
			available: available
		}, function(err, item) {
			if(err) {
				return res.send({'error':'Availability could not be updated'});
			}

            if (req.user) {
                User.findByUsername(req.user.username, function(err, user) {
                    if ( ! err && user) {
                        user.available = available;
                        user.save();
                    }
                });
            }

			res.send({'success':'Availability updated'});
		});
	});


/*	Probably ought to deprecate :username in favour of _id, since the latter is immutable
	(though useful to keep where page uri includes username)
	app.get('/api/v1/users/id/:id', middleware.authenticateApi, function(req, res) {

	});
*/

    app.get('/api/v1/users/username/:username', function (req, res) {

        /*if (req.user && req.user.username == req.param('username')) {
            // This is us, so return straight back...
			return res.send(req.user);
        }*/

        // NB: Don't send req.user straight back - we need to populate things properly here.

		User.findByUsername(req.param('username'), function(err, user) {
			if(!req.user) { // No logged in user
				var contactinfo = { success: true, contact: 'no' };
				var userAndContact = _.extend(user.toObject(), contactinfo);
				return res.send(userAndContact);
			} else {
                if ( ! user) {
                    return res.json(500, { error: 'Could not load user by username ' + req.param('username') });
                }
				Contact
				.findOne({ owner: req.user._id, target_user: user._id })
				.exec(function(err, contact) {
					var notShow = (user.privateProfile === true);
					if (contact && contact.connection_date) {
						notShow = false;
					}

					if (notShow) {
						return res.send(404, { success: false });
					}

					var contactinfo = { success: true, contact: contact || 'no' };

					// Put the user's latest status info in there
					user.populateStatus(function(err, user) {

						// Put the endorse/bookmark info in there
						user.populateBookEnds(contactinfo, req.user, function(err, bookends) {

							var out = _.extend(user.safeOut(),
								contactinfo,
								bookends
							);

							res.send(out);

						});

					});

				});
			}
		});
    });


	/**
	 * Mutual contacts between :username and req.user
	 */
	app.get('/api/v1/users/username/:username/mutual', function(req, res) {

		var current = (req.user ? req.user : { _id: null }),
			limit = req.param('limit') ? req.param('limit') : 20,
        	username = req.param('username');

		User.findOne({ username: username })
		.populate('invited.by')
		.exec(function(err, user) {

			var inviter = user.invited && user.invited.by ? user.invited.by : null;

			var queryOptions = {
                owner: { $in: [user._id, current._id] },
                target_user: { $nin: [null, current._id, user._id] },
                connection_date: { $ne: null },
                connection_isPrivate: { $ne: true }
            };

            if (inviter) {
                queryOptions.target_user = { $ne: inviter._id };
            }

            Contact
            .find(queryOptions)
            .sort('counts.connections')
            .populate('target_user', 'username firstName lastName counts city country')
            .exec(function(err, contacts) {

            	// CR: this won't scale well. But I don't know how to properly get "mutual connections" in mongo with the current schema, sorry.

            	var users = [];

            	// Just want the actual target_user
            	contacts = _.map(contacts, function(contact) {
            		return contact.target_user;
            	});

            	// Group all connections by target username
            	var grouped_users = _.groupBy(contacts, function(contact) {
                    if (contact && contact.username) return contact.username;
            	});

            	// Iterate through the possible connections
            	_.each(grouped_users, function(conns, username) {
            		// conns: array of owner user objects who have "username" as a connection
            		// if the number of users in this array is 2, then both param :username and current user have "username" as connection
            		if (conns.length > 1) {
            			users.push(conns[0]);
            		}
            	});

                if (inviter) {
                    users = [inviter].concat(users);
                }
              
                users = utils.cleanArray(users);

                res.send(users);
            });

		});
	});


	/**
	 * Get public connections of :username
	 */
    app.get('/api/v1/users/username/:username/connections', function (req, res) {

        var limit = req.param('limit') ? req.param('limit') : 20,
        	username = req.param('username');

        User.findOne({ username: username })
        .populate('invited.by')
        .exec(function(err, user) {

            if (err || ! user) {
                return res.send({ 'error': 'User ' + username + ' not found.' });
            }

            var inviter = user.invited && user.invited.by ? user.invited.by : null;

            var queryOptions = {
                owner: user._id,
                target_user: { $ne: null },
                connection_date: { $ne: null },
                connection_isPrivate: { $ne: true }
            };

            if (inviter) {
                queryOptions.target_user = { $ne: inviter._id };
            }

            Contact
            .find(queryOptions)
            // .limit(limit)
            .sort('counts.connections')
            .populate('target_user', 'username firstName lastName counts city country')
            .exec(function(err, contacts) {

                var users = _.map(contacts, function (contact) {
                	if (contact.target_user && contact.target_user._id && contact.target_user !== null) {
                    	return contact.target_user;
                	}
                });

                if (inviter) {
                    users = [inviter].concat(users);
                }
              
                users = utils.cleanArray(users);

                res.send(users);
            });
        });
    });

    app.get('/api/v1/users/findOrphanConnections', function(req, res) {
      var users = Contact.find({})
      .populate('target_user', 'username')
      .populate('owner', 'username')
      .exec(function(err, contacts) {
        var resp = [];
        contacts.forEach(function(contact) {
          if (contact.owner === null || contact.target_user === null) {
            contact.remove();
            resp.push('contact removed');
          }
        });
        res.json(resp);
      });
    });


    app.get('/api/v1/users/id/:id/genbcard', function(req, res) {
		var user_id = req.param('id');

		User.findOne({_id: mongoose.Types.ObjectId(user_id)}, function(err, user) {
			if(err) {
				return res.json(500, {error: 'Could not generate bcard'});
			}

			res.render('bcard.html', _.extend({baseUrl: null}, user));
		});
    });


    app.get('/api/v1/users/username/:username/avatar', function (req, res) {
        User.findByUsername(req.param('username'), function(err, user) {
            if (user && user.bcard && user.bcard.img && user.bcard.img != '') {

            	var src = user.bcard.img;

            	// Support different sizes at request
            	// E.g. /api/v1/users/username/foo/avatar?width=220&height=220
            	if (req.param('width') || req.param('height')) {
            		// Slightly hacky because dimensions are explicitly stored - strip them away and replace with new!
            		src = src.split('?')[0];
            		src = src + '?width=' + parseInt(req.param('width'), 10) + '&height=' + parseInt(req.param('height'), 10);
            	}

                res.redirect(src);
            } else {
                res.redirect('/img/card-default-square.png');
            }
        });
    });


    app.post('/api/v1/users/username/:username/save-contact', middleware.authenticateApi, function (req, res) {
        User.findByUsername(req.param('username'), function(err, user) {
            Contact.findOne({ owner: req.user._id, target_user: user._id }, function (err, contact) {
                if (contact) {
                    res.send(contact);
                } else {
                    contact = new Contact({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        phone: user.phone,
                        emails: user.emails,
                        target_user: user._id,
                    });
                    contact.save(function (err) {
                        res.send(contact);
                    })
                }
            })
        });
    });

    app.post('/api/v1/users/id/:id/endorse', middleware.authenticateApi, function (req, res) {
		console.log('endorse')
		return res.send({'error': 'Endorse- To be built'});
	});

	/**
	 * Track profile views
	 *
	 */
	app.post('/api/v1/users/profile-view', middleware.authenticateApi, function (req, res) {

		var id = req.param('target_id') || null,
			updates = { $inc: { 'counts.views': 1 } };

		if ( ! id) {
			return res.send({ 'error': 'No user ID specified.'});
		}

		User.update({ _id: id }, updates, {}, function(err, affectedCount) {

			if (err) {
				return res.send({ 'error': 'Profile view could not be recorded.' });
			}

			res.send({ 'success': 'Profile view recorded.' });
		});
	});




    /**
     * CR 2014-11-10: Allow all users to have indexes updated
     *
     */
    app.get('/api/v1/users/reindex', middleware.authenticateApi, function(req, res) {

        User.find().exec(function(err, results) {

            console.log("Users reindex");

            _.each(results, function(user) {

                user.updateIndex();
                user.save(function(err) {
                    if ( ! err) {
                        console.log("Reindexed " + user._id);
                    } else {
                        console.log("Error reindexing " + user._id + " (" + err + ")");
                    }
                });

            });

            res.send({ status: true });

        });
    });




    /**
     * Very simple password reset functionality.
     *
     * For security reasons, this can only be accessed from localhost.
     *
     */
    app.get('/api/v1/users/id/:id/pwd/:key', middleware.authenticateApi, function(req, res) {

        var pwd_key = 'W8D3YNWFED1ICGW8EI6MCU0RQ6WHWHS4',
            user_id = req.param('id'),
            key = req.param('key'),
            valid_host = 'localhost:3000',
            http_host = req.headers.host;

        if (valid_host !== http_host) {
            return res.json(500, { error: 'Invalid host' });
        }

        if (key !== pwd_key) {
            return res.json(500, { error: 'Invalid key' });
        }

        User.findOne({ _id: mongoose.Types.ObjectId(user_id) }, function(err, user) {

            if (err || ! user) {
                return res.json(500, { error: 'Could not get user' });
            }

            user.setPassword(user.username, function(err) {
                if (err) {
                    return res.json(500, { error: 'Unable to set password' });
                }

                user.save(function(err) {
                    if (err) {
                        return res.json(500, { error: 'Unable to save changes' });
                    }

                    res.send({ 'success': user.username });
                });

            });

        });

    });

}
