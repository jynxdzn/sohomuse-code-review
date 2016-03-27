define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        navigate = require('navigate'),
        models = require('./../models/models'),
        tmpl = require('text!./NetworkView.html'),
        userTmpl = require('text!./UserView.html');

    var UserView = marionette.ItemView.extend({
        template: function(model) {
            return _.template(userTmpl, model);
        }
    });

    var UsersView = marionette.CollectionView.extend({
        itemView: UserView,

        attributes: {
            style: 'margin-top:20px'
        }
    });

    return marionette.ItemView.extend({
        
        tagName: 'div',

        className: 'network',

        attributes: {
            style: 'margin-top:20px'
        },

        ui: {
            q: '#q'
        },

        events: {
            'submit .frm-search': 'query'
        },

        onBeforeRender: function() {

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }

            if (!this.options.params.type) {
                this.options.params.type = 'contacts';
            }

            this.model = new backbone.Model(this.options.params);

        },
        
        template: function(model) {
            return _.template(tmpl, model);
        },

        onRender: function() {

            this.ui.q.val(this.options.params.q);

            this.users = new models.Users();
            this.users.fetch({ data: $.param(this.options.params)});

            var usersView = new UsersView({
                collection: this.users
            });

            this.$el.find('#users').html(usersView.el);
        },

        query: function(event) {
            event.preventDefault();

            this.options.params.q = this.ui.q.val();
            navigate('network', this.options.params);
        }

    });
});