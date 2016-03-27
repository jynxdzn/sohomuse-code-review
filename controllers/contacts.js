var _ = require('underscore'),
  middleware = require('./../code/middleware'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Contact = mongoose.model('Contact'),
  Invite = mongoose.model('Invite'),
  utils = require('./../code/utils'),
  config = require('./../config'),
  logger = require('./../code/logger'),
  ContactValidator = require('./../validators/contact'),
  foursquare = require('node-foursquare-venues')(config.foursquare.client_id, config.foursquare.client_secret);

module.exports = function (app, passport, agenda) {

  app.get('/api/v1/contacts/reset', middleware.authenticateApi, function (req, res) {

    Contact.remove({}, function (err) {
      User.update({}, {
        counts: {
          connections: 0
        }
      }, {
        multi: true
      }, function (err) {
        res.send({
          status: 'ok'
        });
      });
    });

  });

  /**
   * CR 2014-10-16: Allow all contacts have indexes updated
   *
   */
  app.get('/api/v1/contacts/reindex', middleware.authenticateApi, function (req, res) {

    Contact.find().populate('target_user').exec(function (err, results) {

      console.log("Contacts reindex");

      _.each(results, function (contact) {

        contact.updateIndex();
        contact.save(function (err) {
          if (!err) {
            console.log("Reindexed " + contact._id);
          } else {
            console.log("Error reindexing " + contact._id + " (" + err + ")");
          }
        });

      });

      res.send({
        status: true
      });

    });
  });

  app.get('/api/v1/contacts-debug', middleware.authenticateApi, function (req, res) {

    var query = req.param('q') ? Contact.search(req.param('q')) : Contact.find();

    if (req.param('type') == 'connections') {
      query = query.where('connection_date').ne(null);
    }

    query.sort('firstName').exec(function (err, results) {
      if (err) throw err;

      var contacts = _.map(results, function (contact) {

        return {
          _id: contact._id,
          userId: contact.target_user,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          location: contact.location,
          locationCoord: contact.locationCoord,
          notes: contact.notes,
          tags: contact.tags,
          username: contact.target_username,
          connected: contact.connection_date,
          emails: contact.emails,
          added: contact.added
        };
      });

      res.send(contacts);
    });
  });

  app.get('/api/v1/contacts', middleware.authenticateApi, function (req, res) {
    var query = req.param('q') ? Contact.search(req.param('q')) : Contact.find();

    query = query.where('owner').equals(req.user._id);

    if (req.param('letter')) {
      var letter = req.param('letter'),
        regex_str = '^' + letter,
        regex = new RegExp(regex_str, 'i');

      query = query.where('lastName').regex(regex);
    }

    if (req.param('type') == 'connections') {
      query = query.where('connection_date').ne(null);
    }

    query = query.populate('target_user', 'counts username firstName lastName city country career social bcard representation skills');
    query = query.populate('invite', 'accepted accepted_date date ignored target_email');

    query.sort('-added').exec(function (err, results) {
      if (err) throw err;

      var contacts = _.map(results, function (contact) {

        return {
          _id: (contact && contact._id ? contact._id : null),
          userId: (contact.target_user ? contact.target_user._id : null),
          user: contact.target_user,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          location: contact.location,
          locationCoord: contact.locationCoord,
          notes: contact.notes,
          tags: contact.tags,
          username: contact.target_username,
          connected: contact.connection_date,
          emails: contact.emails,
          added: contact.added,
          invite: (contact.invite ? contact.invite : null)
        };
      });

      res.send(contacts);
    });
  });


  /**
   * Public connections of :username
   */
  app.get('/api/v1/contacts/connections/:username', middleware.authenticateApi, function (req, res) {

    var query = req.param('q') ? Contact.search(req.param('q')) : Contact.find(),
      username = req.param('username'),
      limit = req.param('limit');

    User.findByUsername(username, function (err, user) {

      query = query.where('owner').equals(user._id);
      query = query.where('connection_date').ne(null);

      if (limit) {
        query = query.limit(limit);
      }

      query.sort('-added').exec(function (err, results) {

        if (err) throw err;

        var contacts = _.map(results, function (contact) {
          return {
            _id: contact._id,
            userId: contact.target_user,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            location: contact.location,
            locationCoord: contact.locationCoord,
            notes: contact.notes,
            tags: contact.tags,
            username: contact.target_username,
            connected: contact.connection_date,
            emails: contact.emails,
            added: contact.added
          };
        });

        res.send(contacts);

      });

    });

  });

  app.post('/api/v1/contacts', middleware.authenticateApi, function (req, res) {

    var options = _.extend({}, req.body);
    
    _soho_log.info(options, 'Attempting to create contact');
    
    /*if (!options.target_username && errors.length > 0) {
      _soho_log.info(errors, 'Validation failed when creating contact');
      res.send({
        errors: errors
      })
    }*/
    
    Contact.findOne({
      email: new RegExp('^' + options.emails[0] + '$', "i")
    }).exec(function(resp, contact) {
      if (contact) {
        _soho_log.info(contact, 'Existing contact found');
        contact = _.extend({ existing: true }, contact);
        res.send(contact);
      } else {
        delete options.added;
        options.owner = req.user._id;

        var contact = new Contact(options);
        contact.updateIndex();

        contact.save(function (err) {
          contact = _.extend({ existing: false }, contact);
          res.send(contact);
        })
      }
    });
  });

  app.get('/api/v1/contacts/:id', middleware.authenticateApi, function (req, res) {
    Contact.findOne({
      _id: req.param('id')
    }, function (err, contact) {
      res.send(contact);
    });
  });

  app.get('/api/v1/contacts/:id/vcard.vcf', middleware.authenticateApi, function (req, res) {
    Contact.findOne({
      _id: req.param('id')
    }, function (err, contact) {
      if (err) res.send(500);
      if (!contact) res.send(404);
      res.type('text/vcard');
      res.attachment();
      res.send(contact.generateVcard());
    });
  });

  app.put('/api/v1/contacts/:id', middleware.authenticateApi, function (req, res) {
    Contact.findOne({
      owner: req.user._id,
      _id: req.param('id')
    }).populate('target_user').exec(function (err, contact) {
      if (!err && contact) {
        contact.set(req.body);
        contact.populate('target_user', function () {
          contact.updateIndex();
          contact.save(function (err) {
            res.send(contact);
          });
        });
      } else {
        res.json(500, {
          error: 'Fail'
        });
      }
    });
  });

  app.delete('/api/v1/contacts/:id', middleware.authenticateApi, function (req, res) {
    Contact.removeAll(req.param('id'), req.user, function (err) {
      res.send({
        status: 'ok'
      });
    });
  });

  app.post('/api/v1/contacts/:id/send-bcard', middleware.authenticateApi, function (req, res) {
    Contact.findOne({
      _id: req.param('id')
    }, function (err, contact) {

      contact.bcard = {
        code: new Date().getTime(),
        sent: new Date(),
        read: null,
        opened: null
      };

      contact.save(function (err) {
        if (err) {
          res.json(500, {
            error: 'Fail'
          });

          utils.logMessage("sendReminderEmail could not be scheduled");
          utils.logMessage(err);

        } else {

          utils.logMessage("sendReminderEmail scheduled for +24h!");
          utils.logMessage(contact);

          agenda.schedule('in 24 hours', 'sendReminderEmail', {
            contactId: contact._id,
            baseUrl: req.protocol + '://' + req.headers.host
          });

          var opt = _.extend({
            city: '',
            country: '',
            career: '',
            representation: '',
            social: '',
            bcard: '',
          }, req.user.toObject(), {
            contact: contact,
            baseUrl: req.protocol + '://' + req.headers.host
          });

          req.user.ensureBCardExists(function (ee) {
            utils.sendEmail({
              template: 'bcard',
              subject: 'Here\'s my business card!',
              email: contact.emails[0],
              model: opt,
              attachments: [req.user.generateVcardAttachement()]
            }, function (err, responseStatus) {
              if (err) {
                console.log(err);
                return;
              }

              console.log(responseStatus.message);
              res.send({
                status: responseStatus.message
              });
            });
          });
        }
      });
    });
  });

  app.get('/api/v1/geo', middleware.authenticateApi, function (req, res) {

    if (config.foursquare && config.foursquare.client_id && config.foursquare.client_secret) {

      var queryOptions = {
        ll: req.param('lat') + ',' + req.param('lng'),
        intent: 'checkin',
        limit: 50,
        v: 20130801
      };

      if (req.param('query')) {
        queryOptions.query = req.param('query');
      }

      foursquare.venues.search(queryOptions, function (status, data) {
        if (status == 200 && data.meta && data.meta.code == 200) {
          var lst = _.map(data.response.venues, function (venue) {
            var text = venue.name;
            if (venue.location.address) {
              text += ', ' + venue.location.address;
            }

            return {
              id: text + '|' + venue.location.lat + ',' + venue.location.lng,
              name: venue.name,
              location: venue.location
            }
          });
          res.send(lst);
        } else {
          res.send([]);
        }
      });

    } else {
      res.send([]);
    }
  });
}