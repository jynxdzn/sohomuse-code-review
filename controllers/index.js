var config = require('./../config'),
    middleware = require('./../code/middleware'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Contact = mongoose.model('Contact'),
	Async = require('async'),
	Utils = require('./../code/utils');


function logout(req, clearMessages) {
	if(clearMessages) {
		req.session.messages = {};
	}
	
	delete req.session['uri'];
	req.logout();
}
	

function pushInfoMessage(req, message) {
	req.session.messages = { 'info': message };
}

	
function popInfoMessage(req) {
	if(req.session.messages && req.session.messages['info']) {
		var message = req.session.messages['info'];
		req.session.messages = {};
		return message;
	}
	
	return null;
}
	

module.exports = function(app, passport) {
    app.get('/', function (req, res) {
        if (req.isAuthenticated()) {
            res.redirect('/app');
        } else {
            res.render('login.html', {
				info: popInfoMessage(req),
			});
        }
    });

    app.get('/login', function (req, res) {
        if (req.isAuthenticated()) {
            res.redirect('/app');
        } else {
            res.render('login.html', {
				info: popInfoMessage(req),
			});
        }
    });

    app.post('/login', passport.authenticate('local', {
		successRedirect: '/app',
		failureRedirect: '/login'
	}));


    app.get('/logout', function (req, res) {
		logout(req, true);
		
        res.redirect('/');
    });


	app.get('/recover', function (req, res) {
		logout(req, false);
		
		res.render('recover.html', {
				info: popInfoMessage(req),
		});
	});


	app.get('/recover-username', function (req, res) {
		logout(req, false);
		
		res.render('username.html', {
				info: popInfoMessage(req),
		});
	});

  // Accept either an email address or a username - setup a reset token...
  app.post('/recover', function (req, res) {
    logout(req, false);
    
    var email = req.body.email || '',
        username = req.body.username || '',
        cb_error = function(req, res, err) {
				  pushInfoMessage(req, "There was an error while attempting to recover your account. Please try again.");
				  return res.redirect('/recover');		
        };
    
    User.findOne({ $or: [{ username: username }, {emails: email }] })
    .exec(function(err, user) {
      if (user) {        
        user.requestPasswordReset(function(err) {
          Utils.sendEmail({
            template: 'password-reset',
            subject: 'Password Reset',
            emailFrom: 'SohoMuse <no-reply@sohomuse.com>',
            email: user.emails[0],
            model: {
              baseUrl: req.protocol + '://' + req.headers.host,
              user: user.toObject(),
            },
          }, function(err, responseStatus) {
            if (err) {
              cb_error(req, res, err);
            }
            pushInfoMessage(req, "We've sent you a password recovery email - please check your inbox");
            res.redirect('/');   
          });       
				});
      } else {
        cb_error(req, res, err);
      }
    });
  });
  
  // Accept either an email address or a username - setup a reset token...
  app.post('/recover-username', function (req, res) {
    logout(req, false);
    
    var email = req.body.email,
        cb_error = function(req, res, err) {
				  pushInfoMessage(req, "There was an error while attempting to recover your account. Please try again.");
				  return res.redirect('/recover-username');		
        };
    
    User.findOne({ emails: new RegExp('^' + email + '$', "i") })
    .exec(function(err, user) {
      if (user) {        
        user.requestPasswordReset(function(err) {
          Utils.sendEmail({
            template: 'username-recovery',
            subject: 'Your username',
            emailFrom: 'SohoMuse <no-reply@sohomuse.com>',
            email: user.emails[0],
            model: {
              baseUrl: req.protocol + '://' + req.headers.host,
              user: user.toObject(),
            },
          }, function(err, responseStatus) {
            if (err) {
              cb_error(req, res, err);
            }
            pushInfoMessage(req, "We've sent you an email containing your username - please check your inbox");
            res.redirect('/');   
          });       
				});
      } else {
        cb_error(req, res, err);
      }
    });
  });

  
	app.get('/reset/:userId/:resetcode', function (req, res) {
		logout(req, false);
		
		res.render('reset.html', {
			info: popInfoMessage(req),
		});
	});

	
	app.post('/reset/:userId/:resetcode', function (req, res) {
		logout(req, false);
		
		var userId = req.param('userId') || '';
		var resetCode = req.param('resetcode') || '';
		var password = req.body.password || '';
		
		// TODO: Check password is appropriate?
		
		User.findById(userId, function(err, user) {
			if(err) {
				pushInfoMessage(req, "There was something wrong with the password reset link. Please try again.");
				return res.redirect('/recover');			
			}

			if(!user) {
				pushInfoMessage(req, "There was something wrong with the password reset link. Please try again.");
				return res.redirect('/recover');
			}
			
			user.checkPasswordReset(resetCode, password, function(err, publicError) {
				if(err) {
					pushInfoMessage(req, publicError);
					return res.redirect('/recover');				
				}

				pushInfoMessage(req, "Your password has been reset. You can now log in.");
				res.redirect('/login');
			});
		});
	});


    app.get('/app', middleware.authenticateHuman, function (req, res) {
        var model = {
            user: req.user,
            bundledAssets: config.bundledAssets
        };

        if (req.session.uri) {
            var uri = req.session.uri;
            req.session.uri = false;
            delete req.session['uri'];
            return res.redirect(uri);
        }

        res.render('index', model);
    });

    app.get('/bcard/:senderId/:code', function (req, res) {
        Contact.findOne({ owner: req.param('senderId'), 'bcard.code': req.param('code') }, function (err, contact) {

        	if (contact && contact.owner) {

	            User.findOne({ _id: contact.owner }, function (err, user) {

	                if (contact.bcard.opened == null) {
	                    contact.bcard.opened = new Date();
	                }

	                contact.save(function(e) {
	                    var model = {
	                        user: null,
	                        sender: user.username,
	                        bundledAssets: config.bundledAssets
	                    };

	                    res.render('profile', model);
	                });
	            });

	        }
        });
    });

    app.get('/bcard-img/:senderId/:contactId', function (req, res) {
        Contact.findOne({ owner: req.param('senderId'), _id: req.param('contactId') }, function (err, contact) {
        	if (contact && contact.owner) {
	            User.findOne({ _id: contact.owner }, function (err, user) {
	                if (contact.bcard.read == null) {
	                    contact.bcard.read = new Date();
	                }

	                contact.save(function(e) {
	                    res.sendfile(user.getBcardImagePath());
	                });
	            });
        	}
        });
    });

    app.get('/invite-img/:username/:contactId', function (req, res)
    {
        res.sendfile(config.userfilesDir + '/' + req.param('username') + '/bcard.png');
    });

    // Vanity username URLs
    app.get('/:username', function(req, res)
    {
    	User.findByUsername(req.param('username'), function(err, user) {
    		if ( ! err && user && user.get("_id")) {
    			res.redirect('/app#user/' + encodeURIComponent(user.get('username')));
    		} else {
    			res.redirect('/');
    		}
    	});
    });

    /**
     * Keep-Alive endpoint.
     *
     * This can be posted to periodically to update the user's "last seen" timestamp.
     * The lastSeen value can then be used as a reference for how long ago the user was active.
     * Implemented for email notifications on private message sending so emails are not sent when users are still logged in.
     *
     */
    app.post('/noop', function(req, res) {

    	var user = req.user,
    		data = { lastSeen: Date.now() };

    	if (req.user) {
    		User.update({ _id: user._id }, data, {}, function(err, affectedCount) {
    			if (err) {
    				return res.send({ error: 'Could not update' });
    			} else {
    				res.send({ success: true });
    			}
    		});
    	}
    });

    app.get('/email-preview/:template', middleware.authenticateApi, function(req, res) {

        var _ = require('underscore'),
            path = require('path'),
            templatesDir = path.resolve(__dirname, '../templates'),
            emailTemplates = require('email-templates'),
            tplName = req.param('template'),
            data = {};

        data = {
            baseUrl: req.protocol + '://' + req.headers.host,
            recipientEmail: "testermctesterson@example.com",
            user: req.user
        };

        switch (tplName) {
            case 'invite':
            break;

            case 'message-notification':
                data = _.extend(data, req.user.toObject(), {
                    content: "The messages and notifications and files and projects and contacts and profiles dashboards are now working!",
                    messageId: "54478ca377077fc51d000006"
                });
            break;

            case 'project-collaborator':
                data.project = {
                    _id: "54478ca377077fc51d000006",
                    title: "Test Project"
                };
            break;

            case 'reminder':
                data = _.extend(data, {
                    owner: req.user,
                    firstName: 'Alan',
                    lastName: 'Grant',
                    location: {
                        name: 'Newcastle'
                    },
                    tags: [ "Developer", "Designer", "Creative" ],
                    _id: "54478ca377077fc51d000006"
                });
            break;

            case 'reply':
            break;

            case 'users-connected':
                data = _.extend(data, {
                    recipientName: req.user.firstName,
                    connecting1Name: 'Alan Grant',
                    connecting2Name: 'Ellie Sattler'
                });
            break;
        }

        emailTemplates(templatesDir, function(err, template) {

            if (err) {
                console.log("emailTemplates err:", err);
                return res.send({ error: err });
            }

            template(tplName, data, function(err, html, text) {
                if (err) {
                    console.log("emailTemplates err:", err);
                    return res.send({ error: err });
                }

                return res.send(html);
            });

        });

    });

};
