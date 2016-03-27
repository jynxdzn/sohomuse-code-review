define(function(require) {
	var backbone = require('backbone');
	
    var NewsItem = backbone.Model.extend({
        urlRoot: '/api/v1/news',
        idAttribute: '_id',
        defaults: {
/*            owner: null,
			subject: '',
			body: '',
			parentId: null,
			recipients: [],
			messageType: ''*/
        }
    });

    var NewsItems = backbone.Collection.extend({
        model: NewsItem,
        url: '/api/v1/news',
		lastFetchWasFinalPage: false,

	// We're retrieving some meta data also, so ensure this is parsed out
		parse: function(response) {	
			if(!response) {
				this.lastFetchWasFinalPage = false;
				return [];
			}
			
			this.lastFetchWasFinalPage = response.meta.finalPage;
			
			return response.newsItems;
		}
    });

    return {
        NewsItem: NewsItem,
        NewsItems: NewsItems
    };
});
