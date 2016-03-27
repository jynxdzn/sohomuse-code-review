define(function(require,app) {

    var models = require('./../models/models'),
        backbone = require('backbone'),
		backbonepoller = require('backbonepoller'),
        vent = require('vent'),
        marionette = require('marionette'),
        _ = require('underscore'),
		moment = require('moment'),
        overlay = require('./../overlay/overlay'),
        tmpl = require('text!./NotificationsView.html'),
		messageTmpl = require('text!./NotificationMessageView.html'),
		fileTmpl = require('text!./NotificationFileView.html'),
		contactTmpl = require('text!./NotificationContactView.html'),
		styles = require('css!./Notifications');

    var NotificationView = marionette.ItemView.extend({
		
		className: "row nItem",
		
        template: function(model) {
			switch(model.type) {
				case "message":
					return _.template(messageTmpl, model);
				case "contact":
					return _.template(contactTmpl, model);
				case "file":
					return _.template(fileTmpl, model);
			}
        },
		
		events: {
			'click .markRead': 'markReadStay',
			'click .open': 'markRead'
		},
		
		markReadStay: function(e) {
			e.preventDefault();
			this.updateModel();
		},
		
		markRead: function(e) {
			this.updateModel();
            overlay.reset();
		},
		
		updateModel: function(e) {
			this.model.destroy({
				success: function(model, response) {
					//console.log("response",response);
				}
			});
			vent.trigger("notifications:messageRemoved", this.model);
		}
		
    });

    var NotificationsView = marionette.CollectionView.extend({
        itemView: NotificationView,
		
		className: "col-md-12",

        appendHtml: function(collectionView, itemView) {
			collectionView.$el.prepend(itemView.el);
        }
    });

    return marionette.Layout.extend({
        
        tagName: 'div',

        className: 'notifications',
	
		refresh: function() {
            this.collection.fetch({ data: $.param(this.fetchParams)});
		},
		
		regions: {
			container: ".container",
			messages: ".messages",
			files: ".files",
			contacts: ".contacts",
			notificationList: ".notificationList",
		},

        events: {
            'click .closeMe': 'closeMe',
			'click .open' : 'closeMe'
		},
        
        template: function() {
            return _.template(tmpl);
        },
		
		closeMe: function() {
            overlay.reset();
		},

        onRender: function() {
            var self = this;
			
			this.messages.show(new NotificationsView({
                collection: this.collection.search({type: "message"}),
                type: "message"
            }));
			
			this.contacts.show(new NotificationsView({
                collection: this.collection.search({type: "contact"}),
                type: "contact"
            }));
			
			this.files.show(new NotificationsView({
                collection: this.collection.search({type: "file"}),
                type: "file"
            }));
			
			//this.collection.on('add', this.addOne, this);
			
			/*vent.on('notifications:messageOpened', function(msgIds) { 
				self.collection.each(function(model) {
					if(!model.attributes.seen){
						if(msgIds.indexOf( model.attributes.messageId) != -1 ){
							model.set({seen:Date.now()});
							model.save({patch:true});
						}
					}
				});
				//self.collection.fetch({reset:true,
				//	data: $.param({
				//		type: 'messageCollection',
				//		parentId: self.model.id
				//	})
				//});
				//self.collection.reset();
            });*/

        }/*,

        fetchNotifications: function() {
            this.fetchParams = {
                type: 'notification'
            };
            this.collection.fetch({ data: $.param(this.fetchParams)});
        },

		addOne: function(data){
			if(data.attributes.messageId){
				vent.trigger("notification:message");
			}
		}*/
		
    });
});