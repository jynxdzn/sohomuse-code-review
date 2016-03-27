define(function(require) {

    var marionette = require('marionette'),
        _ = require('underscore'),
        jquery = require('jquery'),
        backbone = require('backbone'),
        selectize = require('selectize'),
        overlay = require('./../overlay/overlay'),
        models = require('./../models/models'),
        LocationField = require('./LocationField'),
        tmpl = require('text!./EditContactView.html'),
		navigate = require('navigate'),
        styles = require('css!./style');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'edit_contact',

        ui: {
            firstName: '#firstName',
            lastName: '#lastName',
            emails: '#emails',
            phone: '#phone',
            notes: '#notes',
            tags: '#tags',
            location: '#location'
        },

        events: {
            'click .btn-save': 'save',
            'click .btn-delete': 'delete',
            'click .btn-back': 'back',
            'click .btn-invite': 'invite'
        },

        template: function(model) {
            return _.template(tmpl, model);
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

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }

            if (this.options.params.action && this.options.params.action == "invite") {
                this.invite();
            }
        },


        save: function() {
            var self = this;

			var $tags = self.ui.tags.val();
			var $emails = self.ui.emails.val();

			var tags = [];
			if($tags) {
				_.each($tags.split(','), function(tag) {
					tag = tag.trim();

					if(tag) {
						tags.push(tag);
					}
				});
			}

			var emails = ($emails) ? $emails.split(',') : [];
			var location = { name: '', coord: ''};
			var locationStr = self.ui.location.val();

			if (locationStr) {
				locationStr = locationStr.split('|');
				if (locationStr.length) {
					location.name = locationStr[0];
				}
				if (locationStr.length > 1){
					location.coord = locationStr[1];
				}
			}

			this.model.set({
				firstName : self.ui.firstName.val(),
                lastName : self.ui.lastName.val(),
				phone : self.ui.phone.val(),
				emails: self.ui.emails.val(),
				tags: tags,
				location: location,
				notes: self.ui.notes.val()
			});

            this.model.save({}, {
				success: function() {
					overlay.alert('The contact has been updated.', function() {
                        navigate('contacts');
					});
				}
            });
        },

        delete: function() {
			var self = this;

            this.model.destroy({ success: function() {
                overlay.alert('The contact has been deleted.', function() {
					navigate("contacts");
                });
            }});
        },

        back: function(e) {
        	navigate('contacts');
        },

        invite: function() {
            $.post('/api/v1/contacts/' + this.model.get('_id') + '/invite').done(function(res) {
                var msg = 'Your invitation has been sent.';
                if (res.status && res.status == 'err') {
                    msg = 'Invitation not sent: ' + (res.reason ? res.reason : 'Unknown error');
                }
                overlay.alert(msg, function() {
                });
            });
        }

    });
});
