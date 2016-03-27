var _ = require('underscore'),
  middleware = require('./../code/middleware'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Contact = mongoose.model('Contact'),
  Invite = mongoose.model('Invite'),
  utils = require('./../code/utils'),
  config = require('./../config'),
  logger = require('./../code/logger'),
  foursquare = require('node-foursquare-venues')(config.foursquare.client_id, config.foursquare.client_secret);

module.exports = function (app, passport) {

  app.get('/api/v1/invites/outgoing', middleware.authenticateApi, function (req, res) {
    req.user.findOutgoingInvitesQuery().populate('contact target_user').exec(function (err, invites) {
      res.send(invites);
    });
  });

  app.delete('/api/v1/invites/outgoing/:id', middleware.authenticateApi, function (req, res) {
    Invite.revoke(req.param('id'), req.user, function (err) {
      res.send({
        status: 'ok'
      });
    });
  });

  app.get('/api/v1/invites/incoming', middleware.authenticateApi, function (req, res) {
    req.user.findIncomingInvitesQuery().populate('owner').exec(function (err, invites) {
      res.send(invites);
    });
  });


  app.get('/api/v1/invites/incoming/:id', middleware.authenticateApi, function (req, res) {

    req.user
      .findIncomingInvitesQuery()
      .where('_id', req.param('id'))
      .populate('owner').exec(function (err, invites) {
        res.send(invites);
      });
  });


  /**
   * Accept a invitation request?
   *
   */
  app.put('/api/v1/invites/incoming/:id', middleware.authenticateApi, function (req, res) {

    req.user
      .findIncomingInvitesQuery()
      .where('_id', req.param('id'))
      .populate('owner')
      .exec(function (err, invites) {

        if (invites && invites.length) {
          var invite = invites[0];

          invite.accept(req, req.user, function (err) {
            logger.logEntry('contactStatus', invite, function (data) {
              console.log("Logged", invite);
            });
            res.send(invite);
          });
        }
      });

  });


  /**
   * Ignore an invitation request?
   *
   */
  app.delete('/api/v1/invites/incoming/:id', middleware.authenticateApi, function (req, res) {

    req.user
      .findIncomingInvitesQuery()
      .where('_id', req.param('id'))
      .populate('owner')
      .exec(function (err, invites) {

        if (invites && invites.length) {
          var invite = invites[0];

          invite.ignore(req.user, function (err) {
            logger.logEntry('contactStatus', invite, function (data) {
              console.log("Logged", invite);
            });
            res.send({
              status: 'ok'
            });
          });
        }
      });

  });


  app.post('/api/v1/contacts/:id/invite', middleware.authenticateApi, function (req, res) {
    Contact.findOne({
      _id: req.param('id')
    }).exec(function (err, contact) {
      if (!contact.invite) {
        if (contact.target_user) {
          var invite = new Invite({
            owner: req.user._id,
            contact: contact._id,
            target_user: contact.target_user
          });


          invite.save(function (err) {
            contact.invite = invite._id;
            contact.save(function (err) {
              res.send({
                status: 'ok'
              });
            });

            logger.logEntry('contact', invite, function (data) {
              console.log("Logged", invite);
            });
          });

        } else {
          // Email address is new to us.
          var invite = new Invite({
            owner: req.user._id,
            contact: contact._id,
            target_email: contact.emails[0]
          });

          invite.save(function (err) {

            contact.invite = invite._id;
            contact.save(function (err) {
              sendInviteEmail(req, contact, function (err, emailRes) {
                if (err) {
                  console.log(err);
                } else {
                  res.send({
                    status: emailRes.message
                  });
                }
              });
            });

          });
        }

      } else {
        // Already got invite, but send again
        sendInviteEmail(req, contact, function (err, emailRes) {
          if (err) {
            console.log(err);
          } else {
            res.send({
              status: emailRes.message
            });
          }
        });
        //res.send({ status: 'err', reason: 'Already invited.' });

      }
    });
  });

  app.get('/register/:inviterId/:inviteCode/:accept', function (req, res) {

    var accept = (req.param('accept') == 'yes');

    Invite.findOne({
        _id: req.param('inviterId'),
        code: req.param('inviteCode')
      })
      .populate('owner contact')
      .exec(function (err, result) {
        if (err) {
          res.redirect('/');
        } else {
          res.render('register.html', {
            invitee: {
              firstName: (result.contact && result.contact.firstName ? result.contact.firstName : ''),
              lastName: (result.contact && result.contact.lastName ? result.contact.lastName : ''),
              email: result.contact.emails[0],
            },
            inviter: {
              firstName: (result.owner && result.owner.firstName ? result.owner.firstName : ''),
              lastName: (result.owner && result.owner.lastName ? result.owner.lastName : ''),
              email: result.owner.emails[0],
            },
            accept: accept,
            info: (req.session.messages && req.session.messages['info'] ? req.session.messages['info'] : false)
          });
        }
      });

  });

  app.post('/register/:inviterId/:inviteCode/:accept', function (req, res) {

    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    Invite.findOne({
        _id: req.param('inviterId'),
        code: req.param('inviteCode')
      })
      .populate('owner contact')
      .exec(function (err, invite) {
        if (err) {
          res.redirect('/');
        } else {

          // Required fields
          var valid = (req.param('username') && req.param('emailAddress') && req.param('password'));
          if (!valid) {
            req.session.messages = {
              'info': 'Please check the required fields and try again'
            };
            return res.redirect(fullUrl);
          }

          // Check to see if the email address or username already exists.
          User.findOne({
              $or: [{
                username: new RegExp('^' + req.param('username') + '$', "i")
              }, {
                emails: new RegExp('^' + req.param('emailAddress') + '$', "i")
              }]
            })
            .exec(function (err, existing) {
              if (err) {
                throw err;
              }
              // If the user exists, let the user know.
              if (existing) {
                req.session.messages = {
                  'info': 'The chosen ' + (existing.username == req.param('username') ? 'username' : 'email address') + ' already exists, do you already have an account?'
                };
                return res.redirect(fullUrl);
              }

              var user = new User({
                username: req.param('username'),
                firstName: req.param('firstName'),
                lastName: req.param('lastName'),
                emails: [req.param('emailAddress')],
                invited: {
                  by: invite.owner,
                  on: invite.date
                }
              });

              var password = req.param('password');

              User.register(user, password, function (err) {
                invite.accept(req, user, function (err) {
                  user.authenticate(password, function () {
                    req.session.messages = {};
                    // Set post-login URI to go to
                    req.session.uri = '/app#edit';
                    res.redirect('/');
                  });
                });
              });
            });
        }
      });
  });

  // Send an invite email to the contact.
  // Contact must already have populated invite.
  function sendInviteEmail(req, contact, cb) {

    contact.populate('invite', function () {

      var invite = contact.invite;

      var opt = _.extend({
        city: '',
        country: '',
        career: '',
        representation: '',
        social: '',
        bcard: '',
      }, req.user.toObject(), {
        contact: contact,
        baseUrl: req.protocol + '://' + req.headers.host,
        inviteId: invite._id,
        inviteCode: invite.code,
      });

      req.user.ensureBCardExists(function (ee) {
        utils.sendEmail({
          template: 'invite',
          baseUrl: req.protocol + '://' + req.headers.host,
          subject: 'Invitation!',
          email: contact.emails[0],
          model: opt
        }, function (err, responseStatus) {
          if (err) {
            //console.log(err);
            return cb(err);
          }

          //console.log(responseStatus.message);
          cb(null, responseStatus.message);
          /*res.send({
    					status: responseStatus.message
    				});*/
        });
      });

    });

  }

}