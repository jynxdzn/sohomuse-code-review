define(function(require) {

    var marionette = require('marionette'),
        _ = require('underscore'),
        backbone = require('backbone'),
		vent = require('vent'),
        selectize = require('selectize'),
        overlay = require('./../overlay/overlay'),
        LocationField = require('./LocationField'),
        tmpl = require('text!./AddContactInternalView.html'),
        styles = require('css!./style');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'add_contact',

        ui: {
            notes: '#notes',
            tags: '#tags',
            location: '#location'
        },

        events: {
            'click .btn-add': 'save',
            'click .btn-invite': 'invite',
			'click .closeMe':'closeMe'
        },
        
		closeMe: function() {
            overlay.reset();
		},
		
        template: function(model) {
            return _.template(tmpl,model);
        },

        onRender: function() {

            var self = this;

            var location = this.model.get('location');
            if (location && location.name) {
                this.ui.location.val(location.name);
            }
            this.ui.tags.val((this.model.get('tags') || []).join(','));
            this.ui.notes.val(this.model.get('notes'));

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

            LocationField(this.ui.location);
        },

        clearForm: function() {
            this.ui.notes.val('');
            this.ui.location.val('');
            this.ui.tags.val('');
        },

        createContact: function() {

            var tags = (this.ui.tags.val()) ? this.ui.tags.val().split(',') : [];

            var location = { name: '', coord: ''};
            var locationStr = this.ui.location.val();

            if (locationStr) {
                locationStr = locationStr.split('|');
                if (locationStr.length) {
                    location.name = location[0];
                }
                if (location.length > 1){
                    location.coord = location[1];
                }
            }

            var options = {
                notes: this.ui.notes.val(),
                tags: tags,
                location: location
            };
			
			this.model.set(options);

            return;
        },

        save: function() {
            var self = this;
            this.createContact();
            this.model.save({}, { success: function(model) {
                overlay.alert('Your contact has been saved', function() {
                });
            }});
        },

        invite: function() {
            var self = this;
            this.createContact();
            this.model.save({}, { success: function(model) {
                $.post('/api/v1/contacts/' + self.model.get('_id') + '/invite').done(function() {
                    overlay.alert('Your invitation has been sent.', function() {
                        model.set('invite', 'done');
                        vent.trigger('connection:request', model);
                    });
                });
            }});
        }

    });
});