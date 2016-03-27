define(function(require) {
	'use strict';

    var backbone = require('backbone'),
        marionette = require('marionette'),
        navigate = require('navigate'),
        jquery = require('jquery'),
        bootstrap_collaspe = require('bootstrap.collapse'),
        bootstrap_dropdown = require('bootstrap.dropdown'),
        vent = require('vent'),
        globals = require('globals'),
        NotificationsCountView = require('./../notifications/NotificationsCountView'),
        UsersModalView = require('./../users_modal/UsersModalView'),
		models = require('./../models/models'),
        ProfileView = require('./../profile/ProfileView');

    var app = new marionette.Application({ vent: vent });

    app.addRegions({
        mainRegion: '#page',
        overlayRegion: '#overlay',
    });

    app.addInitializer(function() {
        var self = this;
        var pro = new models.Profile({ username: window.sender });
        pro.fetch({
            success: function () {
                self.mainRegion.show(new ProfileView({ model: pro }));
            },
            error: function () {
                navigate('/');
            }
        });
    });

	app.addInitializer(function(app) {
        var self = this;

        this.overlayRegion.on('show', function() {
            this.$el.addClass('fs-overlay');
        });

        this.overlayRegion.on('close', function() {
            this.$el.removeClass('fs-overlay');
        });

        this.vent.on('overlay:show', function (view) {
            self.overlayRegion.show(view);
        });

        this.vent.on('overlay:reset', function () {
            self.overlayRegion.reset();
        });
    });

    return app;
});
