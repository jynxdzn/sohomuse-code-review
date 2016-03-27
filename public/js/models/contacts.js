define(function(require) {

    var backbone = require('backbone');

    var Contact = backbone.Model.extend({
        urlRoot: '/api/v1/contacts',
        idAttribute: '_id',
        defaults: {
            firstName: null,
            lastName: null,
            phone: null,
            emails: [],
            notes: null,
            tags: [],
            location: {
                name: '',
                coord: ''
            },
            city: '',
            country: '',
            connection_date: null,
            target_user: null,
            target_username: null
        }
    });

    var Bookmark = backbone.Model.extend({
        urlRoot: '/api/v1/bookmarks/me',
        idAttribute: '_id',
        defaults: {
            firstName: null,
            lastName: null,
            emails: [],
            notes: '',
            tags: [],
            location: {
                name: '',
                coord: ''
            }
        }
    });

    var Nearby = backbone.Model.extend({
        url: '/api/v1/nearbys/me',
        idAttribute: '_id',
        defaults: {
            firstName: null,
            lastName: null,
            emails: [],
            notes: null
        }
    });

    var IncomingInvite = backbone.Model.extend({
        urlRoot: '/api/v1/invites/incoming',
        idAttribute: '_id',
        defaults: {
            date: null,
            owner: {
                username: null,
                firstName: null,
                lastName: null,
                emails: [],
            }
        }
    });

    var OutgoingInvite = backbone.Model.extend({
        urlRoot: '/api/v1/invites/outgoing',
        idAttribute: '_id',
        defaults: {
            date: null,
            contact: {
                firstName: null,
                lastName: null,
                emails: [],
                notes: null,
                tags: [],
                location: {
                    name: '',
                    coord: ''
                }
            }
        }
    });

    var Contacts = backbone.Collection.extend({
        model: Contact,
        url: '/api/v1/contacts'
    });

    var Bookmarks = backbone.Collection.extend({
        model: Bookmark,
        url: '/api/v1/bookmarks/me',
		parse: function(data) {
			return data.contacts;
		}
    });

    var Nearbys = backbone.Collection.extend({
        model: Nearby,
        url: '/api/v1/nearbys/me',
		parse: function(data) {
			return data.contacts;
		}
    });

    var IncomingInvites = backbone.Collection.extend({
        model: IncomingInvite,
        url: '/api/v1/invites/incoming'
    });

    var OutgoingInvites = backbone.Collection.extend({
        model: OutgoingInvite,
        url: '/api/v1/invites/outgoing'
    });

    return {
        Contact: Contact,
        Contacts: Contacts,
        Bookmark: Bookmark,
        Bookmarks: Bookmarks,
        Nearby: Nearby,
        Nearbys: Nearbys,
        IncomingInvite: IncomingInvite,
        IncomingInvites: IncomingInvites,
        OutgoingInvite: OutgoingInvite,
        OutgoingInvites: OutgoingInvites,
    };

});
