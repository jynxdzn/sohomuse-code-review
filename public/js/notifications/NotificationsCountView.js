define(function(require) {

    var models = require('./../models/models'),
        backbone = require('backbone'),
        backbonepoller = require('backbonepoller'),
        vent = require('vent'),
        marionette = require('marionette'),
        _ = require('underscore'),
        globals = require('globals'),
        overlay = require('./../overlay/overlay'),
        bootstrap_popover = require('bootstrap.popover'),
        tmpl = require('text!./NotificationsCountView.html'),
        messageTmpl = require('text!./NotificationMessageView.html'),
        fileTmpl = require('text!./NotificationFileView.html'),
        contactTmpl = require('text!./NotificationContactView.html'),
        styles = require('css!./NotificationsCount');

    var notificationCount = new models.NotificationCount();

    // Subviews

    var NotificationView = marionette.ItemView.extend({

        className: "nItem",

        template: function(model) {
            switch(model.type) {
                case "message":
                    model.shortBody = globals.wordLimit(model.messageId.body, 15);
                    return _.template(messageTmpl, model);
                case "contact":
                    return _.template(contactTmpl, model);
                case "file":
                    return _.template(fileTmpl, model);
            }
        },

        events: {
            'click .markRead': 'markReadStay',
            'click .open': 'markRead',
            'click .accept': 'acceptInvite',
            'click .ignore': 'ignoreInvite'
        },

        markReadStay: function(e) {
            e.preventDefault();
            this.updateModel();
        },

        markRead: function(e) {
            this.updateModel();
        },

        updateModel: function(e) {
            this.model.destroy({
                success: function(model, response) {
                    //console.log("response",response);
                }
            });
            vent.trigger("notifications:messageRemoved", this.model);
            vent.trigger("notifications:contactUpdated", this.model);
        },

        acceptInvite: function(e) {

            e.preventDefault();
            var self = this;

            var invite = new models.IncomingInvite({ _id: this.model.get('inviteId') });
            invite.fetch({
                success: function() {
                    invite.set({ approved: true });
                    invite.save({}, {
                        success: function() {
                            self.updateModel();
                        }
                    });

                }
            });
        },

        ignoreInvite: function(e) {

            e.preventDefault();
            var self = this;

            var invite = new models.IncomingInvite({ _id: this.model.get('inviteId') });
            invite.fetch({
                success: function() {
                    invite.destroy({
                        success: function(model, response) {
                            self.updateModel();
                        }
                    });
                }
            });
        }

    });

    var NotificationsView = marionette.CollectionView.extend({
        itemView: NotificationView,
        className: 'notifications-wrapper',
        tagName: 'div',

        appendHtml: function(collectionView, itemView) {
            collectionView.$el.prepend(itemView.el);
        }
    });

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'notify-container',

        events: {
            'click .notify-action': 'hide'
        },

        model: notificationCount,

        ui: {
            'content_messages': '#notify_content_messages',
            'content_contacts': '#notify_content_contacts',
        },

        messagesView: '',
        contactsView: '',

        template: function(model) {
            return _.template(tmpl,model);
        },

        initialize: function(){

            // Create views for the individual notification item types. Their collections will get populated later.
            this.contactsView = new NotificationsView({ type: "contact" });
            this.messagesView = new NotificationsView({ type: "message" });

            this.model.on("change", this.updateView, this);

            var pollerOptions = {
                // default delay is 1000ms
                delay: 20000,
                // run after the first delay. defaults to false
                delayed: false
            };

            var poller = backbonepoller.get(this.model,pollerOptions).start();
            poller.on('success', function(notifications) {
                //console.info('another successful fetch!');
            });
            var self = this;

            vent.on('notifications:messageRemoved', function() {
                var counted = self.countCollection();
                self.model.set({message: counted.message});
            });

            vent.on('notifications:messageOpened', function(msgids) {
                self.collection.each(function(n) {
                    if(!n.attributes.seenbyme) {
                        if (n.attributes && n.attributes.messageId && msgids.indexOf(n.attributes.messageId._id) != -1 ) {
                            n.set({seenbyme:true});
                            n.save({patch:true});
                        }
                    }
                });
                var counted = self.countCollection();
                self.model.set({message: counted.message});
            });

            vent.on('notifications:contactUpdated', function(connectionCreator) {
                self.collection.each(function(n) {
                    if(n.attributes.owner._id == connectionCreator) {
                        n.set({seenbyme:true});
                        n.save({patch:true});
                    }
                });
                var counted = self.countCollection();
                self.model.set({contact: counted.contact});
                self.render();
            });

        },

        onRender: function() {

            var self = this,
                c = null;

            // Attach popovers
            this.$el.find(".notify-item").popover({
                html: true,
                placement: "bottom",
                content: function() {

                    // Get the content for the popover
                    var type = $(this).data("type"),        // Get the type of notification the popover is for
                        content = "content_" + type,        // Get reference to "empty" DOM element for this type
                        view = self[type + "View"];     // Get reference to the View relating to this type

                    // If there is a view and it has a populated collection, then there are notifications to show.
                    // Otherwise, show the empty one with a call-to-action button.
                    return (view && view.collection && view.collection.length > 0 ? view.render().el : self.ui[content].html());
                }
            });

        },

        updateView: function() {
            var self = this,
                c = null;

            this.collection.fetch({
                update: true,
                success: function() {
                    //console.log(self.collection);
                    // Update the individual view collections with a filtered notification list
                    self.contactsView.collection = self.collection.search({ type: "contact" });
                    self.messagesView.collection = self.collection.search({ type: "message" });
                }
            });

            if (this.model.changed.contact) {
                vent.trigger('notifications:contactsChanged');
            }
            if (this.model.changed.file) {
                vent.trigger('notifications:filesChanged');
            }
            if (this.model.changed.message) {
                vent.trigger('notifications:messagesChanged');
            }

            this.render();
        },

        countCollection: function(){
            var counted = _.countBy(this.collection.models, function(r) {
                if (r.attributes.seen.length === 0) {
                    return r.attributes.type;
                } else {
                    return r.attributes.type + '_seen';
                }
            });
            return counted;
        },

        hide: function() {
            this.$el.find(".notify-item").popover('hide');
        }

    });

});
