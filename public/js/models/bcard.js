define(function (require) {

    var backbone = require('backbone');

    var Bcard = backbone.Model.extend({
		urlRoot: '/api/v1/bcard',
        idAttribute: '_id',
        defaults: {
            code: '',
			img: '',
			dimensions: []
        }
    });

    return {
        Bcard: Bcard
    };
});