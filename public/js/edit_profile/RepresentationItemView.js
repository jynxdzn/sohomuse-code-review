define(function(require) {
    var marionette = require('marionette'),
        _ = require('underscore'),
		models = require('./../models/models'),
        itemViewTemplate = require('text!./RepresentationItemView.html');
	
	return marionette.ItemView.extend({
		model: models.Representation,
		tagName: 'tr',
		
		template: function(model) {
			var list_id = model.get('_id');
			if(typeof list_id == 'undefined') {
				list_id = model.cid;
			}
					
			return _.template(itemViewTemplate, _.extend(model.toJSON(), {list_id: list_id}));
		},
		
		render: function() {
			this.$el.html(this.template(this.model));
		}
	});
});