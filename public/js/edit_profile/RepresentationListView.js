define(function(require) {
    var marionette = require('marionette'),
		itemView = require('./RepresentationItemView');	
		
	return marionette.CollectionView.extend({
		itemView: itemView,
		tagName: 'table',
		attributes: {
			class: "table"
		}
	});
});