define(function(require) {

    var backbone = require('backbone');

    var Project = backbone.Model.extend({
        urlRoot: '/api/v1/projects',
        idAttribute: '_id',
        defaults: {
            title: null,
            owner: null,
    		collaborators: [],
    		endorsements: [],
    		photos: [],
		    videos: [],
    		isLive: false,
    		isComplete: false,
    		startDate: null,
    		endDate: null,
    		added: null,
    		requiredRoles: [],
    		userRoles: [],
    		background: null,
    		summary: null,
   			location: null
        },

		toMoreJSON: function() {
			var j = _(this.attributes).clone();
			j.shortBackground = this.shortBackground();
			return j;
		},

        shortBackground: function() {

        	var out = "",
        		text2 = this.get("background").replace(/\s+/g, ' '),
        		text3 = text2.split(' '),
        		numWords = text3.length,
        		wordLimit = 50,
				i = 0;

			if (numWords > wordLimit) {
				for (i = 0; i < wordLimit; i++) {
					out = out + " " + text3[i] + " ";
					return out + "...";
				}
			} else {
				return this.get("background");
			}
		}

    });

    var Projects = backbone.Collection.extend({
        model: Project,
        url: '/api/v1/projects'
    });

    return {
        Project: Project,
        Projects: Projects,
    };

});