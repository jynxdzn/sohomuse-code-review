define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
		vent = require('vent'),
		globals = require('globals'),
        navigate = require('navigate'),
        models = require('./../models/models'),
        views = require('./ContactViews'),
        tmpl = require('text!./ContactsView.html'),
        styles = require('css!./style');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'network',

        attributes: {
            style: 'padding-top:40px'
        },

        ui: {
            q: '#q'
        },

        events: {
            'click .contacts': 'fetchContacts',
            'click .connections': 'fetchConnections',
            'click .bookmarks': 'fetchBookmarks',
            'click .nearby': 'fetchNearby',
            'click .incoming': 'fetchIncomingInvites',
            'click .outgoing': 'fetchOutgoingInvites',
            'submit .form-search': 'query',
            'click .alphabet a': 'fetchLetter'
        },

        onBeforeRender: function() {

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }

            if (!this.options.params.type) {
                this.options.params.type = 'contacts';
            }

            var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
            	data = _.extend({}, this.options.params, { alphabet: alphabet });

            this.model = new backbone.Model(data);
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        onRender: function() {

			var self = this,
				subView = null;

            this.ui.q.val(this.options.params.q);

            switch (this.options.params.type) {
                case 'incoming':

                    this.contacts = new models.IncomingInvites();
                    this.contacts.fetch();

                    subView = new views.IncomingInvitesView({
                        collection: this.contacts
                    });

                break;

                case 'outgoing':

                    this.contacts = new models.OutgoingInvites();
                    this.contacts.fetch();

                    subView = new views.OutgoingInvitesView({
                        collection: this.contacts
                    });

                break;

                case 'bookmarks':

                    this.contacts = new models.Bookmarks();
                    this.contacts.fetch();

                    subView = new views.BookmarksView({
                        collection: this.contacts
                    });

                break;

                case 'nearby':

                    this.contacts = new models.Nearbys();
                    this.contacts.fetch();

                    subView = new views.NearbysView({
                        collection: this.contacts
                    });

                break;

                default:

                    this.contacts = new models.Contacts();
                    this.contacts.fetch({ data: $.param(this.options.params)});

                    subView =  new views.ContactsView({
                        collection: this.contacts
                    });
            }

            this.$el.find('#contacts').html(subView.el);

			vent.on('notifications:contactsChanged', function(contact) {
				self.render();
			});

			globals.setBackgroundBlank();
        },

        query: function(event) {
            event.preventDefault();

            this.options.params.q = this.ui.q.val();
            navigate('contacts', this.options.params);
        },

        fetchContacts: function(event) {
            event.preventDefault();
            if (this.options.params.type != 'contacts') {
                this.options.params.type = 'contacts';
                navigate('contacts', this.options.params);
            }
        },

        fetchConnections: function(event) {
            event.preventDefault();
            if (this.options.params.type != 'connections') {
                this.options.params.type = 'connections';
                navigate('contacts', this.options.params);
            }
        },

        fetchLetter: function(event) {
        	event.preventDefault();
        	this.options.params.letter = $(event.currentTarget).data('char');
            if (this.options.params.letter.length !== 1) {
                this.options.params.q = '';
                delete this.options.params.q;
            }
        	navigate('contacts', this.options.params);
        },

        fetchBookmarks: function(e) {
            e.preventDefault();
            if (this.options.params.type != 'bookmarks') {
                this.options.params.type = 'bookmarks';
                navigate('contacts', this.options.params);
            }
        },

        fetchNearby: function(e) {
            e.preventDefault();
            if (this.options.params.type != 'nearby') {
                this.options.params.type = 'nearby';
                navigate('contacts', this.options.params);
            }
        },

        fetchIncomingInvites: function(event) {
            event.preventDefault();
            navigate('contacts', { type: 'incoming' });
        },

        fetchOutgoingInvites: function(event) {
            event.preventDefault();
            navigate('contacts', { type: 'outgoing' });
        }

    });
});
