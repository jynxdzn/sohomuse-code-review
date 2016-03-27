define(function(require) {

    var backbone = require('backbone');

    var Notification = backbone.Model.extend({
        urlRoot: '/api/v1/notifications',
        idAttribute: '_id',
        defaults: {
            owner: null,
			type: null,
			profileChange: null,
			fileId: null,
			messageId: null,
			recipients: [],
			contactId: null,
			seen: []
        }
    });

    var Notifications = backbone.Collection.extend({
        model: Notification,
        url: '/api/v1/notifications',
		
		initialize: function(){
			this.sortVar = 'added';
		},
		
		comparator: function(data){
			return -new Date(data.get(this.sortVar));
		},
		
		search: function(opts) {
			var result = this.where(opts);
			return new Notifications(result);
		}
		
    });
	
	var NotificationCount = backbone.Model.extend({
        url: '/api/v1/notifications/count',
        defaults: {
			message: 0,
			message_seen: 0,
			file: 0,
			file_seen: 0,
			contact: 0,
			contact_seen: 0
        }
    });

    return {
        Notification: Notification,
        Notifications: Notifications,
		NotificationCount: NotificationCount
    };

});
