define(function(require) {

    /*var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        jquery = require('jquery'),
        models = require('./../models/models');*/

    var jquery = require('jquery'),
        backbone = require('backbone'),
        marionette = require('marionette'),
        vent = require('vent'),
        equalize = require('equalize'),
        models = require('./../models/models'),
        tmpl = require('text!./ConnectionsFullView.html'),
        userTmpl = require('text!./UserView.html');

	var UserView = marionette.ItemView.extend({

    	tagName: 'div',
    	//className: 'col-md-2 full-connections-user',
        className: 'col-xs-6 col-sm-6 col-md-4 col-lg-3 full-connections-user',

        template: function(model) {
            return _.template(userTmpl, model); //'<img src="/api/v1/users/username/<%= username %>/avatar" width="110" height="110">', model);
        }

    });

    var UsersView = marionette.CollectionView.extend({
        tagName: 'div',
        className: 'full-connections-list row',
        itemView: UserView
    });

    var ConnectionsView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'connections-full',

        serializeData: function() {
        	return {
        		user: this.options.user,
        		title: this.options.title
        	};
        },

        ui: {
        },

        events: {
        },

        onRender: function() {

            var u = new UsersView({
                collection: this.options.connections
            });
            this.$el.find('.users-viewport').append(u.render().el);

        },

        template: function(model) {
            return _.template(tmpl, model);
        }

    });


    /**
     * opts should include user (model), connections (collection), and type (string).
     */
    return function(opts) {

    	switch (opts.type) {
    		case 'all':
    			opts.title = opts.user.get('firstName') + '&rsquo;s connections';
    			break;

    		case 'mutual':
    			opts.title = 'Yours and ' + opts.user.get('firstName') + '&rsquo;s mutual connections';
    			break;

            case 'endorsements':
                opts.title = opts.user.get('firstName') + '&rsquo;s endorsements';
                break;

    		default:
    			opts.title = opts.title ? opts.title : 'Connections';
    	}

        return new ConnectionsView(opts);

    };

});
