define(function(require) {

    var backbone = require('backbone');

    var Message = backbone.Model.extend({
        urlRoot: '/api/v1/messages',
        idAttribute: '_id',
        defaults: {
            owner: null,
			subject: '',
			body: '',
			parentId: null,
			recipients: [],
			messageType: ''
        }
    });

    var Messages = backbone.Collection.extend({
        model: Message,
        url: '/api/v1/messages',

		initialize: function(){
			this.sortVar = 'added';
		},

		comparator: function(data){
			return new Date(data.get(this.sortVar));
		},

		search: function( opts ){
			var result = this.where( opts );
			var resultCollection = new Messages( result );

			return resultCollection;
		},

		searchMsg: function( messageid ){
			var result = this.filter(function(item) {
				return item.get('_id') == messageid || item.get('parentId') == messageid;
			});
			var resultCollection = new Messages( result );

			return resultCollection;
		},
    });

	var MessagesIndex = backbone.Collection.extend({
        model: Message,
        url: '/api/v1/messages',

		initialize: function(){
			this.sortVar = 'latestMessageDate';
		},

		comparator: function(data){
			return new Date(data.get(this.sortVar));
		},

		search: function( opts ){
			var result = this.where( opts );
			var resultCollection = new Messages( result );

			return resultCollection;
		},

		searchMsg: function( messageid ){
			var result = this.filter(function(item) {
				return item.get('_id') == messageid || item.get('parentId') == messageid;
			});
			var resultCollection = new Messages( result );

			return resultCollection;
		},
    });

    return {
        Message: Message,
        Messages: Messages,
		MessagesIndex: MessagesIndex
    };

});
