define(function(require) {
	'use strict';

    var backbone = require('backbone'),
        marionette = require('marionette'),
        navigate = require('navigate'),
        jquery = require('jquery'),
        cookie = require('jquery.cookie'),
        bootstrap_collaspe = require('bootstrap.collapse'),
        bootstrap_dropdown = require('bootstrap.dropdown'),
        vent = require('vent'),
        globals = require('globals'),
        Router = require('./router'),
        NotificationsCountView = require('./../notifications/NotificationsCountView'),
        UsersModalView = require('./../users_modal/UsersModalView'),
		models = require('./../models/models');

    function collaspeMobileNav() {
        jquery('.navbar-collapse').collapse('hide');
    }

    var app = new marionette.Application({ vent: vent });

    app.addRegions({
        mainRegion: '#page',
        notificationRegion: '#notifications',
		overlayRegion: '#overlay',
    });

    app.mainRegion.on('show', function(view) {
        window.scrollTo(0, 0);
    });

    app.addInitializer(function() {
        new Router({ app: this });
        backbone.history.start();
    });

    app.addInitializer(function() {
        // Mobile menu
        $('#logo, .navbar-nav li a, .navbar-add-contact, #notifications').not('.dropdown-toggle').click(function() {
            collaspeMobileNav();
        });
    });

    app.addInitializer(function() {
        // Search form
        $('form.frm-search').submit(function(event) {
            event.preventDefault();
            var q = $('form.frm-search input').val();
            if (q) {
                collaspeMobileNav();
                $('form.frm-search').css('z-index', 3000);
				navigate('search', { q: q });
            }
        });

        vent.on('overlay:reset', function() {
            $('form.frm-search').css('z-index', '');
        });
    });

    app.addInitializer(function(app) {
		var self = this;
		var notifications = new models.Notifications();
		notifications.fetch({
			success: (function (data) {
				self.notificationRegion.show(new NotificationsCountView({app: this, collection: notifications }));
				//overlay.show(new NotificationsView({ collection: notifications }));
			})
		});
		//this.notificationRegion.show(new NotificationsCountView({app: this}));
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
  
	  app.addInitializer(function(app) {
      if (!jquery.cookie('soho.welcome')) {
        var dialog_html =  '<div id="overlay" class="fs-overlay">';
            dialog_html += '<div class="welcome"><div class="container" id="welcome_container">';
            dialog_html += '<div class="row">';
            dialog_html += '<div class="col-md-12 text-center">';
            dialog_html += '<div class="video-container">';
            dialog_html += '<iframe src="//player.vimeo.com/video/114886683" width="500" height="281" frameborder="0" webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen="true"></iframe>';
            dialog_html += '</div>';
            dialog_html += '<button type="button" class="btn btn-primary btn-close">Close</button>';
            dialog_html += '</div>';
            dialog_html += '</div>';
            dialog_html += '</div>';
            dialog_html += '</div></div>';
        var dialog = $(dialog_html);
            dialog.find('.btn-close').click(function(e) {
              e.preventDefault();
              $(this).closest('.fs-overlay').fadeOut();
              $.cookie('soho.welcome', '1', { expires: 365 });
            });
        dialog.hide();
        $('#fullpage').before(dialog);
        dialog.fadeIn();
      }
    });

    /**
     * KeepAlive. See @sendKeepAlive in globals.js
     *
     */
    app.addInitializer(function(app) {
    	var interval = 30;		// seconds
    	this.keepalive = window.setInterval(globals.sendKeepAlive, interval * 1000);
    	globals.sendKeepAlive();
    });

    return app;
});