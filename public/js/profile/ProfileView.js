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
        tmpl = require('text!./ProfileView3.html'),
        styles = require('css!./style2'),
        BusinessCardView = require('./../business_card/BusinessCardView'),
        FileSelectorView = require('./../file_selector/FileSelectorView'),
        ConnectionsView = require('./../connections/ConnectionsView'),
        ConnectionsFullView = require('./../connections/ConnectionsFullView'),
        //AvailabilityView = require('./../availability/AvailabilityView'),
        CalendarView = require('./../calendar/CalendarView'),
        GalleryView = require('./widgets/GalleryView'),
        ProjectsView = require('./widgets/ProjectsView'),
        ProjectView = require('./widgets/ProjectView'),
        ShowcaseView = require('./widgets/ShowcaseView'),
        AboutView = require('./widgets/AboutView'),
        RepresentationView = require('./widgets/RepresentationView'),
		AddContactInternalView = require('./../add_contact/AddContactInternalView');

    return marionette.Layout.extend({

        tagName: 'div',
        className: 'profile',

        share: null,

		initialize: function() {

            var self = this;

            if ( ! this.model.get('bookmark_notes')) {
                this.model.set('bookmark_notes');
            }

            if ( ! this.model.get('endorsement_notes')) {
                this.model.set('endorsement_notes');
            }

			this.model.on('change', this.render, this);
		},

        template: function(model) {
            return _.template(tmpl, model);
        },

        events: {
            'click .btn-connections': 'showConnections',
            'click .btn-connect': 'addContact',
            'click .btn-message': 'sendMessage',
            'click .btn-profile': 'showProfile',
            'click .btn-about': 'showAbout',
            'click .btn-media': 'showMedia',
            'click .btn-projects': 'showProjects',
            'click .btn-calendar': 'showCalendar',
            'click .btn-representation': 'showRepresentation',
            'click .profile-area': 'updateNav',
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
            gallery: '.gallery',
            showcase: '.showcase',
            connections: '.connections-container',
            about: '.about-container',
            search: '.search-container',
            availability: '.availability-container'
        },

        ui: {
            btnContainer: '.btn-container',
            showcasePrev: '.showcase-prev',
            showcaseNext: '.showcase-next'
        },

        onRender: function() {
            var self = this;

			globals.setBackgroundFromModel(this.model);

            this.showcaseView = new ShowcaseView(this.model.get('username'));
            this.showcase.show(this.showcaseView);

            this.bcard.show(new BusinessCardView({ model: this.model }));
            this.about_view = new AboutView({ model: this.model });
            this.connections.show(new ConnectionsView(this.model.get('username')));

            // this.availability.show(new AvailabilityView(this.model.get('username')));
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

            // If project was requested (by router) then load it
            if (this.options && this.options.project) {
            	this.toggleOverlay(true);
            	this.about.show(new ProjectView({ model: this.options.project }));
			}

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

            $(".profile-nav").show();

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

		newsLike: function(e) {
			e.preventDefault();
			var $newsItem = $(e.currentTarget).closest(".newsitem");
			var $newsLikes = $newsItem.find(".newsLikes");
			var numLikes = parseInt($newsLikes.text());

			$.post('/api/v1/news/like', {
				id: $newsItem.attr('data-id')
			}).done(function() {
				$newsLikes.text(numLikes + 1);
				$newsItem.removeClass("is-unliked").addClass("is-liked");
				/*overlay.alert('Your like has been noted.', function() {
				});*/
			});
		},

   		newsUnlike: function(e) {
   			e.preventDefault();
			var $newsItem = $(e.currentTarget).closest(".newsitem");
			var $newsLikes = $newsItem.find(".newsLikes");
			var numLikes = parseInt($newsLikes.text());

			$.post('/api/v1/news/unlike', {
				id: $newsItem.attr('data-id')
			}).done(function() {
				$newsLikes.text(numLikes - 1);
				$newsItem.removeClass("is-liked").addClass("is-unliked");
				/*overlay.alert('Your like has been noted.', function() {
				});*/
			});
		},

		viewAllConnections: function(e) {
			e.preventDefault();
			this.toggleOverlay(true);

			var type = $(e.currentTarget).data("type"),
				self = this,
        		view = null,
            	connections = new models.Contacts();

            if (type == 'all') {
				connections.url = '/api/v1/users/username/' + this.model.get('username') + '/connections';
            } else if (type == 'mutual') {
                connections.url = '/api/v1/users/username/' + this.model.get('username') + '/mutual';
            } else if (type == 'endorsements') {
            	connections.url = '/api/v1/user-endorsements/username/' + this.model.get('username');
            }

            connections.fetch({

				success: function(res) {

					self.about.show(new ConnectionsFullView({
						user: self.model,
						type: type,
						connections: res
					}));
        			self.toggleNav(true);

				}

			});

		},

        panelChangeBgImage: function() {
            var self = this;

            vent.on('overlay:reset', function() {
                window.location.hash = '';
            });

            FileSelectorView.show({
                only_images: true,
                select: function(fileModel) {
                    self.saveBgImage(fileModel);
                    FileSelectorView.hide();
                    window.location.hash = '';
                }
            });
        },

        saveBgImage: function(fileModel) {
            var self = this;
            this.model.save({
				bgimage: fileModel.attributes._id
			}, {
				patch: true,
				success: function() {
//					var url = '/api/v1/files/' + self.model.get('bgimage') + '/download';

//					alert();
//					globals.setBackgroundWithUrl(url);
//                    self.$el.css('background-image', 'url(/img/flare.png), url(/img/flare2.png), url(/api/v1/files/' + self.model.get('bgimage') + '/download)');
//                    navigate('/');
				}
            });
        },

        showConnections: function() {
            UsersModalView.show({
                username: this.model.get('username'),
                title: this.model.get('firstName') + ' ' + this.model.get('lastName') + '\'s connections'
            });
        },

        addContact: function() {

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
         * Show main profile (hide the other sections)
         */
        showProfile: function(ev) {
            this.toggleOverlay(false);
            history.pushState(null, null, '#user/' + encodeURIComponent(this.model.get("username")));
        },


        /**
         * Show the "about" content
         */
        showAbout: function(ev) {
            this.toggleOverlay(true);
            this.toggleNav(true);
            this.about.show(this.about_view);
            history.pushState(null, null, '#user/' + encodeURIComponent(this.model.get("username")));
        },


        /**
         * Show the "media" content
         */
        showMedia: function(ev) {
            this.toggleOverlay(true);
            this.toggleNav(true);
            this.about.show(GalleryView(this.model.get('username')));
            history.pushState(null, null, '#user/' + encodeURIComponent(this.model.get("username")));
        },


        /**
         * Show the "projects" content
         */
        showProjects: function() {
            this.toggleOverlay(true);
            this.toggleNav(true);
            this.about.show(ProjectsView(this.model.get('username')));
            history.pushState(null, null, '#user/' + encodeURIComponent(this.model.get("username")));
        },


        /**
         * Show the "representation" content
         */
        showRepresentation: function() {
            this.toggleOverlay(true);
            this.toggleNav(true);
            this.about.show(new RepresentationView({model: this.model}));
            history.pushState(null, null, '#user/' + encodeURIComponent(this.model.get("username")));
        },


        showCalendar: function(e) {
            e.preventDefault();
        	this.toggleOverlay(true);
        	this.about.show(new CalendarView(this.model.get('username'), 'large'));
        	this.toggleNav(true);
            history.pushState(null, null, '#user/' + encodeURIComponent(this.model.get("username")));
        },


        showSearch: function(searchView) {
        	this.toggleOverlay(true);
        	this.search.show(searchView);
        	this.toggleNav(false);
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


        toggleNav: function(status) {
        	if (status === true) {
        		// Show nav, hide search
        		this.$el.find('.profile-nav').show();
        		//this.about.show();
        		this.search.close();
        	} else {
        		// Hide nav, show search
        		this.$el.find('.profile-nav').hide();
        		//this.search.show();
        		this.about.close();
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

        loadPage: function(page) {
            $("[data-page='" + page + "']").trigger("click");
        }

    });
});
