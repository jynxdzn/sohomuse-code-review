define(function(require) {

	var backbone = require('backbone'),
		marionette = require('marionette'),
		_ = require('underscore'),
		vent = require('vent'),
		navigate = require('navigate'),
        moment = require('moment'),
		overlay = require('./../overlay/overlay'),
		models = require('./../models/models'),
		contactTmpl = require('text!./ContactView.html'),
		bookmarkTmpl = require('text!./BookmarkView.html'),
		nearbyTmpl = require('text!./NearbyView.html'),
		incomingTmpl = require('text!./IncomingInviteView.html'),
		outgoingTmpl = require('text!./OutgoingInviteView.html');

	var ContactView = marionette.ItemView.extend({
		template: function(model) {
			return _.template(contactTmpl, model);
		},

		events: {
			'click .btn-invite': 'invite',
            'click .btn-sendbcard': 'sendBcard'
		},

		invite: function(e) {
            e.preventDefault();
			$.post('/api/v1/contacts/' + this.model.get('_id') + '/invite').done(function(res) {
				var msg = 'Your invitation has been sent.';
				if (res.status && res.status == 'err') {
					msg = 'Sorry, the invitation was not sent: ' + res.reason;
				}
				overlay.alert(msg, function() {
				});
			});
		},

        sendBcard: function(e) {
            e.preventDefault();
            $.post('/api/v1/contacts/' + this.model.get('_id') + '/send-bcard').done(function() {
                overlay.alert('Your business card has been sent.', function() {
                });
            });
        }

	});

	var BookmarkView = marionette.ItemView.extend({
		template: function(model) {
			return _.template(bookmarkTmpl, model);
		}
	});

	var NearbyView = marionette.ItemView.extend({
		template: function(model) {
			return _.template(nearbyTmpl, model);
		}
	});

	var IncomingInviteView = marionette.ItemView.extend({

		template: function(model) {
			return _.template(incomingTmpl, model);
		},

		initialize: function(){
			this.model.on('change', this.render, this);
		},

		events: {
			'click .btn-approve':'approve',
			'click .btn-ignore':'ignore'
		},

		approve: function() {
			var model = this.model;
			model.set({ approved: true });
			model.save({}, {
				success: function () {
					vent.trigger('notifications:contactUpdated', model.attributes.creator);
					model.trigger('destroy', model, model.collection, {});
				}
			});
		},

		ignore: function() {
			var connectionCreator = this.model.attributes.creator;
			this.model.destroy({success: function(model, response) {
				vent.trigger('notifications:contactUpdated', connectionCreator);
			}});
		}

	});

	var OutgoingInviteView = marionette.ItemView.extend({

		template: function(model) {
			return _.template(outgoingTmpl, model);
		},

		initialize: function(){
			this.model.on('change', this.render, this);
		},

		events: {
			'click .btn-revoke': 'revoke'
		},

		revoke: function(){
			var connectionCreator = this.model.attributes.creator;
			this.model.destroy({ success: function(model, response) {
				vent.trigger('notifications:contactUpdated', connectionCreator);
			}});
		}

	});

	var ContactsView = marionette.CollectionView.extend({
		itemView: ContactView
	});

	var BookmarksView = marionette.CollectionView.extend({
		itemView: BookmarkView
	});

	var NearbysView = marionette.CollectionView.extend({
		itemView: NearbyView
	});

	var IncomingInvitesView = marionette.CollectionView.extend({
		itemView: IncomingInviteView
	});

	var OutgoingInvitesView = marionette.CollectionView.extend({
		itemView: OutgoingInviteView
	});

	return {
		ContactView: ContactView,
		ContactsView: ContactsView,
		BookmarkView: BookmarkView,
		BookmarksView: BookmarksView,
		NearbyView: NearbyView,
		NearbysView: NearbysView,
		IncomingInviteView: IncomingInviteView,
		IncomingInvitesView: IncomingInvitesView,
		OutgoingInviteView: OutgoingInviteView,
		OutgoingInvitesView: OutgoingInvitesView
	};
});
