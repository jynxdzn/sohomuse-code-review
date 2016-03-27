/**
 * ProfileMiniView.
 *
 * The profile mini view is the profile content that should appear in the "sidebar".
 *
 */

define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        jquery = require('jquery'),
        navigate = require('navigate'),
        _ = require('underscore'),
        vent = require('vent'),
        models = require('./../models/models'),
		globals = require('globals'),
        overlay = require('./../overlay/overlay'),
		Share = require('share'),
		sortable = require('jquery.ui.sortable'),
        bootstrap_popover = require('bootstrap.popover'),
        bootstrap_tooltip = require('bootstrap.tooltip'),
        bootstrap_tab = require('bootstrap.tab'),
        tmpl = require('text!./ProfileMiniView.html'),
        styles = require('css!./style.mini'),
        BusinessCardView = require('./../business_card/BusinessCardView'),
        ConnectionsView = require('./../connections/ConnectionsView'),
        CalendarView = require('./../calendar/CalendarView'),
        ShowcaseView = require('./widgets/ShowcaseView'),
		AddContactInternalView = require('./../add_contact/AddContactInternalView');

    return marionette.Layout.extend({

        tagName: 'div',
        className: 'profile-mini',

        share: null,

		initialize: function() {

            var self = this;

            if ( ! this.model.get('bookmark_notes')) {
                this.model.set('bookmark_notes');
            }

            if ( ! this.model.get('endorsement_notes')) {
                this.model.set('endorsement_notes');
            }

            this.model.set('mode', this.options && this.options.mode || false);

			this.model.on('change', this.render, this);
		},

        template: function(model) {
            return _.template(tmpl, model);
        },

        events: {
            // 'click .btn-connections': 'showConnections',
            'click .btn-connect': 'addContact',
            'click .btn-message': 'sendMessage',
            // 'click .btn-profile': 'showProfile',
            // 'click .btn-about': 'showAbout',
            // 'click .btn-media': 'showMedia',
            // 'click .btn-projects': 'showProjects',
            // 'click .btn-calendar': 'showCalendar',
            // 'click .btn-representation': 'showRepresentation',
            // 'click .profile-area': 'updateNav',
            'click .showcase-btn-prev': 'showcasePrev',
            'click .showcase-btn-next': 'showcaseNext',
			'click .btn-endorse-action': 'endorseToggle',
			'click .btn-bookmark-action': 'bookmarkToggle',
            'click .newsLikeToggle': 'newsLikeToggle',
			'click .newsLike': 'newsLike',
			'click .newsUnlike': 'newsUnlike',
			'click .connections-all': 'viewAllConnections'
        },

        regions: {
            bcard: '.bcard-container',
            showcase: '.showcase',
            connections: '.connections-container',
            availability: '.availability-container'
        },

        ui: {
            showcasePrev: '.showcase-prev',
            showcaseNext: '.showcase-next'
        },

        onShow: function() {
            var mode = (this.options && this.options.mode && this.options.mode === 'search' ? 'search' : 'default');
            if (mode === 'default') {
                $(".pane-wrapper > .profile-nav, .pane-wrapper > .profile-summary-box").show().attr("style", "");
            }
        },

        onRender: function() {
            var self = this;

			globals.setBackgroundFromModel(this.model);

            this.showcaseView = new ShowcaseView(this.model.get('username'));
            this.showcase.show(this.showcaseView);

            this.bcard.show(new BusinessCardView({ model: this.model }));
            this.connections.show(new ConnectionsView(this.model.get('username')));
            this.availability.show(new CalendarView(this.model.get('username'), 'mini'));

            // Wait for showcase files
            this.showcaseView.collection.on("files:success", function() {
                var showcaseCount = self.showcaseView.collection.models.length;
                if (showcaseCount > 0) {
                    // There is at least one showcase item - show the showreel
                    $('.tabs-profile a[href="#showreel-tab"]').tab('show');
                } else {
                    // No showcase items - show connections.
                    $('.tabs-profile a[href="#connections-tab"]').tab('show');
                }
            });

            vent.on('connection:request', function(contact) {
                self.model.set({contact: contact.attributes});
            });

            vent.on('connection:cancel', function() {
                self.model.set({contact: 'no'});
            });

			this.updateButtons();

			if (this.options && this.options.call) {
				this[this.options.call]();
			}

            if ( ! self.share) {
                setTimeout(function() { self.initShare(); }, 1000);
            } else {
                self.initShare();
            }

            // Hook up endorse and bookmark stuff
            self.initBookEndButtons();

            // Activate BS tooltips
            $('body').tooltip({
                selector: '.bs-tooltip',
                animation: false
            });

            var nav = this.$el.find(".profile-nav").clone(),
                bio = this.$el.find(".profile-summary-box").clone(),
                wrapper = this.$el.find(".pane-wrapper");

            $(".pane-wrapper > .profile-nav, .pane-wrapper > .profile-summary-box").remove();

            bio.prependTo($(".pane-wrapper"));
            nav.prependTo($(".pane-wrapper"));

            var $likeBtn = this.$el.find(".likeToggle");

            // Attach event handler to update class and text depending on liked status (gets triggered after successful like/unlike action)
            $likeBtn.on("refresh", function() {
                var $el = $(this),
                    liked = ($el.data("status") == "on"),
                    onText = 'Unlike (<%= count %>)',
                    offText = 'Like (<%= count %>)';

                if (liked) {
                    $el.text(_.template(onText, $el.data()));
                    $el.addClass("is-liked");
                } else {
                    $el.text(_.template(offText, $el.data()));
                    $el.removeClass("is-liked");
                }
            });

            $likeBtn.trigger("refresh");

        },

        // Attach share functionality
        initShare: function() {
            var self = this;
            self.share = new Share(".btn-share", {
                url: 'http://' + document.location.host + '/' + self.model.get('username'),
                title: 'Soho Muse',
                description: self.model.get('firstName') + ' ' + self.model.get('lastName') + ' on SohoMuse',
                ui: { flyout: "top left" }
            });
        },

        showcasePrev: function() {
            this.showcaseView.paginate("prev");
        },

        showcaseNext: function() {
            this.showcaseView.paginate("next");
        },

        initBookEndButtons: function() {

            var self = this,
                $endorse_content = null,
                $bookmark_content = null;

            // Endorse

            if ( self.model.get('endorsed')) {
                $endorse_content = self.$el.find(".endorse-popover.is-endorsed");
            } else {
                $endorse_content = self.$el.find(".endorse-popover.not-endorsed");
            }

            self.$el.find(".btn-endorse").popover({
                html: true,
                placement: "bottom",
                title: "Endorse",
                content: function() {
                    return $endorse_content.html();
                }
            });

            // Bookmark

            if ( self.model.get('bookmarked')) {
                $bookmark_content = self.$el.find(".bookmark-popover.is-bookmarked");
            } else {
                $bookmark_content = self.$el.find(".bookmark-popover.not-bookmarked");
            }

            self.$el.find(".btn-bookmark").popover({
                html: true,
                placement: "bottom",
                title: "Bookmark",
                content: function() {
                    return $bookmark_content.html();
                }
            });

        },

		endorseToggle: function(e) {
			e.preventDefault();
			var self = this,
                $input = $(e.currentTarget).siblings(".form-group").find("textarea[name=endorse_notes]");

			if(!self.model.get('endorsed')) {
				$.ajax({
					type: "POST",
					url: '/api/v1/user-endorsements/me',
					data: {
						target_id: self.model.get('_id'),
                        notes: $input.val()
					},
					dataType: 'json'
				}).done(function(response) {
                    self.model.set('endorsed', true);
					self.model.set('endorsement_notes', $input.val());
					self.updateButtons();
				}).fail(function() {
				});
			} else {
				$.ajax({
					type: "DELETE",
					url: '/api/v1/user-endorsements/me',
					data: {
						target_id: self.model.get('_id')
					},
					dataType: 'json'
				}).done(function(response) {
					self.model.set('endorsed', false);
					self.updateButtons();
				}).fail(function() {
				});
			}
		},

		bookmarkToggle: function(e) {
            e.preventDefault();
            var self = this,
                $input = $(e.currentTarget).siblings(".form-group").find("textarea[name=bookmark_notes]");;

			if(!self.model.get('bookmarked')) {
				$.ajax({
					type: "POST",
					url: '/api/v1/bookmarks/me',
					data: {
						target_id: self.model.get('_id'),
                        notes: $input.val()
					},
					dataType: 'json'
				}).done(function(response) {
                    self.model.set('bookmarked', true);
					self.model.set('bookmark_notes', $input.val());
					self.updateButtons();
				}).fail(function() {
				});
			} else {
				$.ajax({
					type: "DELETE",
					url: '/api/v1/bookmarks/me',
					data: {
						target_id: self.model.get('_id')
					},
					dataType: 'json'
				}).done(function(response) {
					self.model.set('bookmarked', false);
					self.updateButtons();
				}).fail(function() {
				});
			}
		},

        newsLikeToggle: function(e) {
            e.preventDefault();

            var $newsItem = $(e.currentTarget).closest(".newsitem"),
                id = $newsItem.attr('data-id'),
                $likeBtn = $(e.currentTarget),
                likeCount = $likeBtn.data('count');

            if ($likeBtn.data("status") === "off") {
                // Like it
                $.post('/api/v1/news/like', {
                    id: id
                }).done(function() {
                    $likeBtn
                    .data("status", "on")
                    .data("count", parseInt(likeCount, 10) + 1)
                    .trigger("refresh");
                });
            } else if ($likeBtn.data("status") === "on") {
                // Unlike it
                $.post('/api/v1/news/unlike', {
                    id: id
                }).done(function() {
                    $likeBtn
                    .data("status", "off")
                    .data("count", parseInt(likeCount, 10) - 1)
                    .trigger("refresh");
                });
            }
        },

        addContact: function() {
          
            navigate('user/' + this.model.attributes.username);

            var contact = null;
            if (typeof this.model.attributes.contact == 'object') {
                contact = new models.Contact(this.model.attributes.contact);
                overlay.show(new AddContactInternalView({ model: contact }));
            } else {
                contact = new models.Contact({
                    target_user: this.model.attributes._id,
                    target_username: this.model.attributes.username,
                    firstName: this.model.attributes.firstName,
                    lastName: this.model.attributes.lastName,
                    emails: new Array(this.model.attributes.emails[0])
                });
                overlay.show(new AddContactInternalView({ model: contact }));
            }
        },

        /**
         * Send this user a message
         */
        sendMessage: function() {
        	navigate('messages', { rcpt: this.model.get("username") });
        },

        /**
         * Toggle the overlay content for the about/media/projects content
         */
        toggleOverlay: function(status) {
            if (status === true) {
                // SHOW the overlay content
                this.$el.find(".profile-body").addClass("visible");
                this.$el.find(".profile-summary-box").hide();
            } else {
                this.$el.find(".profile-body").removeClass("visible");
                this.$el.find(".profile-summary-box").show();
            }
        },

        updateNav: function(ev) {
            $(".profile-area.selected").removeClass("selected");
            $(ev.currentTarget).addClass("selected");
        },

		updateButtons: function() {
            var btnEndorse = this.$el.find(".btn-endorse");
            if (this.model.get('endorsed'))
			    btnEndorse.addClass("active");
            else
                btnEndorse.removeClass("active");

			var btnBookmark = this.$el.find(".btn-bookmark");
            if (this.model.get('bookmarked'))
                btnBookmark.addClass("active");
            else
                btnBookmark.removeClass("active");
		},

		/**
		 * Track profile view for counts
		 *
		 */
		trackProfileView: function() {
			$.ajax({
				type: "POST",
				url: '/api/v1/users/profile-view',
				data: {
					target_id: this.model.get('_id')
				},
				dataType: 'json'
			});
		},

/*        loadPage: function(page) {
            $("[data-page='" + page + "']").trigger("click");
        }*/

    });
});
