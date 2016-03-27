define(function(require) {

    var jquery = require('jquery'),
        backbone = require('backbone'),
        marionette = require('marionette'),
        vent = require('vent'),
        overlay = require('./../overlay/overlay'),
        models = require('./../models/models'),
        tmpl = require('text!./UsersModalView.html'),
        userTmpl = require('text!./UserView.html');

    var UserView = marionette.ItemView.extend({

        template: function(model) {
            return _.template(userTmpl, model);
        }

    });

    var UsersView = marionette.CollectionView.extend({
        itemView: UserView
    });

    var UsersModalView = marionette.Layout.extend({

        className: 'container',
        
        regions: {
            thumbs: ".thumbs"
        },

        events: {
            'click .prev': 'fetchPrev',
            'click .next': 'fetchNext',
            'click img': 'selectFile',
            'click .dismiss' : 'dismissMe',
        },

        dismissMe: function () {
            vent.trigger('overlay:reset');
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        fetch: function() {

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }
            this.users.fetch({ data: $.param(this.options.params)});
        },

        onBeforeRender: function() {

            // if (typeof this.options.only_images) {
            //     this.options.params.image = true;
            // }

            // if (typeof this.options.select != 'function') {
            //     this.options.select = function() {};
            // }
            
            // this.options.params.take = 12;
            // this.options.params.skip = 0;

            // if (!this.options.params.type) {
            //     this.options.params.type = 'my_files';
            // }

            this.model = new backbone.Model(this.options);

            this.users = new models.Users([], { username: this.options && this.options.username ? this.options.username : null });
            this.fetch();
        },

        onRender: function() {
            this.thumbs.show(new UsersView({ collection: this.users }));
        }
    });

    function show(options) {
        if (typeof options == 'function') {
            overlay.show(new UsersModalView({ select: options }));
        } else if (typeof options == 'object') {
            overlay.show(new UsersModalView(options));
        } else {
            overlay.show(new UsersModalView());
        }
    }

    function hide() {
        overlay.reset();
    }

    return {
        show: show,
        model: UsersModalView,
        hide: hide
    };
});