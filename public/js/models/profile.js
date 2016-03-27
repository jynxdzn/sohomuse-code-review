define(function (require) {

    var backbone = require('backbone'),
		globals = require('globals');


	var RepresentationModel = backbone.Model.extend({
		idAttribute: '_id',
		defaults: {
			type: '',
			name: '',
			email: '',
			phone1: '',
			phone2: '',
			address1: '',
			address2: '',
			address3: '',
			city: '',
			state: '',
			zip: '',
			country: ''
		}
	});


	var RepresentationCollection = Backbone.Collection.extend({
		model: RepresentationModel
	});


	var Profile = backbone.Model.extend({
        url: function() {
			if(!this.get('me')) {
				return '/api/v1/users/username/' + this.get('username');
			}

			return '/api/v1/users/me';
		},
		model: {
			representation: RepresentationCollection,
		},
		defaults: {
			me: false,
        	username: '',

			privateProfile: false,
			firstName: '',
            lastName: '',
            phone: '',
            emails: [],

			bgimage: null,

            country: 'United States',
			city: '',
			summary: '',
            bio: '',

			career: {
				occupation: '',
				awards: ''
			},

			skills: {
				accents: [],
				languages: [],
				performance: [],
				athletic: []
			},

			appearance: {
				height: '',
				weight: '',
				hair: '',
				hairLength: '',
				eyes: ''
			},

			representation: null,

			bcard: {
				code: '',
				img: '',
				dimensions: []
			},

			social: {
				skype: '',
				twitter: '',
				facebook: '',
				instagram: '',
				linkedin: '',
				blog: '',
				website: ''
			},

            status: {
                id: null,
                time: null,
                data: { text : '' }
            },

            locationName: '',
            available: null,
            counts: { connections: 0, views: 0 }
        },

		initialize: function() {
			this.set('representation', new RepresentationCollection());
			this.bind("change:bgimage", this.changeHandlerBgimage);
		},

		parse: function(response){
			// Construct sub-models
			for(var key in this.model) {
				var embeddedClass = this.model[key];
				var embeddedData = response[key];
				response[key] = new embeddedClass(embeddedData, {parse:true});
			}

			return response;
		},

		changeHandlerBgimage: function(event){
			//globals.setBackgroundFromModel(this);
        }
    });

	return {
		Profile: Profile,
		Representation: RepresentationModel,
		RepresentationCollection: RepresentationCollection
	};
});

