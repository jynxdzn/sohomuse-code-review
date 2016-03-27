define(function(require) {

    var marionette = require('marionette'),
        _ = require('underscore'),
        jquery = require('jquery'),
        backbone = require('backbone'),
        selectize = require('selectize'),
        overlay = require('./../overlay/overlay'),
        navigate = require('navigate'),
        models = require('./../models/models'),
        LocationField = require('./LocationField'),
        tmpl = require('text!./AddContactView.html'),
        styles = require('css!./style');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'add_contact',

        ui: {
            firstName: '#firstName',
            lastName: '#lastName',
            email: '#emails',
            phone: '#phone',
            notes: '#notes',
            tags: '#tags',
            location: '#location'
        },

        events: {
            'click .btn-add': 'add',
            'click .btn-invite': 'invite',
            'click .btn-send': 'send',
            'click .closeMe': 'closeMe'
        },

        initialize: function() {
            _.bindAll(this, 'clearForm');
        },

        template: function() {
            return _.template(tmpl);
        },

        onRender: function() {
            var self = this;

            self.ui.tags.selectize({
                delimiter: ',',
                persist: false,
                create: function(input) {
                    return {
                        value: input,
                        text: input
                    };
                }
            });

            LocationField(self.ui.location);
        },

        clearForm: function() {
            if (this.ui.email) {
                this.ui.email.val('');
                this.ui.firstName.val('');
                this.ui.lastName.val('');
                this.ui.phone.val('');
                this.ui.notes.val('');
                this.ui.location.val('');
                this.ui.tags.val('');
            }
        },

        createContact: function() {

            var tags = (this.ui.tags.val()) ? this.ui.tags.val().split(',') : [];

            var location = { name: '', coord: ''};
            var locationStr = this.ui.location.val();

            if (locationStr) {
                locationStr = locationStr.split('|');
                if (locationStr.length) {
                    location.name = locationStr[0];
                }
                if (location.length > 1){
                    location.coord = locationStr[1];
                }
            }


            var options = {
                firstName: this.ui.firstName.val(),
                lastName: this.ui.lastName.val(),
                phone: this.ui.phone.val(),
                emails: [this.ui.email.val()],
                notes: this.ui.notes.val(),
                tags: tags,
                location: location
            };

            return new models.Contact(options);
        },

        add: function() {
            var self = this;
            var contact = this.createContact();
            contact.save({}, { success: function() {
                overlay.alert('The contact has been added.', function() {
                    //self.clearForm();
                    navigate('contacts');
                });
            }});
        },

        invite: function() {
            var self = this;
            var contact = this.createContact();
            $('.has-error').each(function() {
              $(this).removeClass('has-error');
              $(this).find('.alert').remove();
            });
            contact.save({}, { success: function(obj, data) {
                if (data.errors) {
                  for (var i in data.errors) {
                    var el = $('#' + i);
                    el.closest('.form-group').addClass('has-error');
                    for (var e in data.errors[i]) {
                      el.parent().append($('<div>').addClass('alert alert-danger').text(data.errors[i][e]));
                    }
                  }
                  return;
                }
                $.post('/api/v1/contacts/' + contact.get('_id') + '/invite').done(function(res) {
                    var msg = 'Your invitation has been sent.';
                    if (res.status && res.status == 'err') {
                        msg = 'Added contact, but there was an error with the invitation: ' + res.reason;
                    }
                    overlay.alert(msg, function() {
                        navigate('contacts');
                    });
                });
            }, error: function(resp) {
                overlay.alert('Email address belongs to existing user', function() {
                  navigate('contacts');
                });
            }});
        },

        send: function() {
            var self = this;
            var contact = this.createContact();
            contact.save({}, { success: function() {
                $.post('/api/v1/contacts/' + contact.get('_id') + '/send-bcard').done(function() {
                    overlay.alert('Your business card has been sent.', function() {
                        //self.clearForm();
                        navigate('contacts');
                    });
                });
            }});
        },

        closeMe: function() {
            overlay.reset();
            Backbone.history.history.back();
        }

    });
});
