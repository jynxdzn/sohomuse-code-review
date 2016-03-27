define(function(require) {
    'use strict';

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        navigate = require('navigate'),
        models = require('./../models/models'),
        globals = require('globals'),
        overlay = require('./../overlay/overlay'),
        cpaginate = require('cpaginate'),
        BusinessCardView = require('./../business_card/BusinessCardView'),
        tmpl = require('text!./DashboardView.html'),
        bootstrap_tooltip = require('bootstrap.tooltip'),
        newsItemTmpl = require('text!./NewsItemView.html'),
        newsItemStatusTmpl = require('text!./NewsItemStatusView.html'),
        newsItemLocateTmpl = require('text!./NewsItemLocateView.html'),
        newsItemAvailabilityTmpl = require('text!./NewsItemAvailabilityView.html'),
        newsItemAddPicturesTmpl = require('text!./NewsItemAddPicturesView.html'),
        newsItemAddVideoTmpl = require('text!./NewsItemAddVideoView.html'),
        newsItemAddAudioTmpl = require('text!./NewsItemAddAudioView.html'),
        newsItemAddDocumentTmpl = require('text!./NewsItemAddDocumentView.html'),
        newsItemAddProjectTmpl = require('text!./NewsItemAddProjectView.html'),
        newsItemUpdateProjectTmpl = require('text!./NewsItemUpdateProjectView.html'),
		newsItemUsersConnectedTmpl = require('text!./NewsItemUsersConnectedView.html'),
        projectViewTmpl = require('text!./ProjectView.html'),
        contactSmallViewTmpl = require('text!./ContactSmallView.html'),
        contactViewTmpl = require('text!./ContactView.html'),
        styles = require('css!./style');

    var NewsItemView = marionette.ItemView.extend({

        template: function(model) {
            var actionHtml = '';
            var newsItemHtml = '';

            var compiledItem = _.template(newsItemTmpl);
            switch(model.action) {
                case 'status':
                    actionHtml = "updated their status";
                    newsItemHtml = _.template(newsItemStatusTmpl, model);
                    break;

                case 'locate':
                    actionHtml = "updated their location";
                    newsItemHtml = _.template(newsItemLocateTmpl, model);
                    break;

                case 'availability':
                    actionHtml = "updated their availability";
                    newsItemHtml = _.template(newsItemAvailabilityTmpl, model);
                    break;

                case 'add_pictures':
                    actionHtml = "added some pictures";
                    newsItemHtml = _.template(newsItemAddPicturesTmpl, model);
                    break;

                case 'add_video':
                    actionHtml = "added a video";
                    newsItemHtml = _.template(newsItemAddVideoTmpl, model);
                    break;

                case 'add_audio':
                    actionHtml = "added an audio clip";
                    newsItemHtml = _.template(newsItemAddAudioTmpl, model);
                    break;

                case 'add_document':
                    actionHtml = "added a document";
                    newsItemHtml = _.template(newsItemAddDocumentTmpl, model);
                    break;

				case 'add_project':
                    actionHtml = "added a project";
                    newsItemHtml = _.template(newsItemAddProjectTmpl, model);
                    break;

				case 'update_project':
                    actionHtml = "updated a project";
                    newsItemHtml = _.template(newsItemUpdateProjectTmpl, model);
                    break;

				case 'users_connected':
                    actionHtml = "connected with...";
                    newsItemHtml = _.template(newsItemUsersConnectedTmpl, model);
                    break;
            }

            return compiledItem(_.extend(model, {actionHtml: actionHtml, newsItemHtml: newsItemHtml}));
        },


        onRender: function() {
            var $likeBtn = this.$el.find(".likeToggle"),
                $commentBtn = this.$el.find(".commentToggle");

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


            // Attach event handler to update class and text depending on comments
            $commentBtn.on("refresh", function() {
                var $el = $(this),
                    commented = ($el.data("status") == "on"),
                    text = 'Comment (<%= count %>)';

                $el.text(_.template(text, $el.data()));

                if (commented) {
                    $el.addClass("has-commented");
                } else {
                    $el.removeClass("has-commented");
                }
            });

            // Trigger buttons to refresh on load to set initial style & text
            $likeBtn.trigger("refresh");
            $commentBtn.trigger("refresh");
        }

    });


    var NewsItemsView = marionette.CollectionView.extend({
        itemView: NewsItemView
    });


    var ProjectView = marionette.ItemView.extend({
        tagName: 'li',
        className: 'media dash-project',

        template: function(model) {
            return _.template(projectViewTmpl, model);
        }
    });


    var ProjectListView = marionette.CollectionView.extend({
        tagName: 'ul',
        className: 'dash-projects',
        itemView: ProjectView
    });


    var ContactView = marionette.ItemView.extend({
        tagName: 'div',
        className: 'col-sm-4 col-md-6 profile-lozenge',

        template: function(model) {
            return _.template(contactViewTmpl, model);
        }
    });


    var ContactListView = marionette.CollectionView.extend({
        tagName: 'div',
        className: 'connections-inner-2',
        itemView: ContactView
    });


    var ContactSmallView = marionette.ItemView.extend({
        tagName: 'div',
        className: 'profile-lozenge-small',

        template: function(model) {
            var data = {};
            if (model.target) {
                // It's an endorsement
                data = {
                    firstName: model.target.firstName,
                    lastName: model.target.lastName,
                    username: model.target.username,
                    notes: model.notes || null
                };
            } else {
                // It's... not an endorsement. (probably "Nearby")
                data = {
                    firstName: model.firstName,
                    lastName: model.lastName,
                    username: model.username,
                    notes: null
                };
            }


            return _.template(contactSmallViewTmpl, data);
        }
    });


    var ContactSmallListView = marionette.CollectionView.extend({
        itemView: ContactSmallView
    });


    var NearbySmallListView = marionette.CollectionView.extend({
        itemView: ContactSmallView      //NearbySmallView
    });


    return marionette.Layout.extend({
        tagName: 'div',

        className: 'dashboard',

        events: {
            'click .action-status-set': 'statusSet',
            'click .action-location-toggle': 'locationToggle',
            'click .action-location-set': 'locationSet',
            'click .action-availability-toggle': 'availabilityToggle',
            'click .action-availability-set': 'availabilitySet',
            'click .commentToggle': 'commentToggle',
            'click .commentSubmit': 'commentSubmit',
            'click .newsLikeToggle': 'newsLikeToggle',
            'click .commentLikeToggle': 'commentLikeToggle',
            'click .btn-project-new': 'newProject',
            'click @ui.btn_more_news_items': 'loadMoreNewsItems'
        },


		ui: {
			status_text: '#status_text',
			location_name: '#location_name',
			btn_more_news_items: '.btn-more-newsitems'
		},

        regions: {
            bcard: ".bcard-container"
        },

        initialize: function() {
            _.bindAll(this, 'locationSet');
            _.bindAll(this, 'availabilitySet');
            _.bindAll(this, 'commentSubmit');
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        onRender: function() {
            var self = this;
            globals.setBackgroundFromModel(this.model);

            $('body').tooltip({
                selector: '.bs-tooltip',
                animation: false
            });

        // BCard...
            this.bcard.show(new BusinessCardView({ model: this.model }));

        // Projects...
            this.projects = new models.Projects();
            var projectListView = new ProjectListView({
                collection: this.projects
            });

            this.$el.find('.projects-inner').html(projectListView.el);
            this.projects.fetch({
                success: function(res) {

                    // Update count on successful fetch
                    self.$el.find('.project-count').html('(' + res.length + ')');

                    // Paginate the projects
                    self.$el.find(".dash-projects").cPaginate({
                        numPerPage: 3,
                        itemSelector: '.dash-project',
                        pagerPrevClass: 'cpaginate-prev pull-left',
                        pagerPrevHtml: '<img src="/img/sarr-left.png">',
                        pagerNextClass: 'cpaginate-next pull-right',
                        pagerNextHtml: '<img src="/img/sarr-right.png">'
                    });
                }
            });


        // Connections...
            this.connections = new models.Contacts();
            var contactListView = new ContactListView({
                className: 'dash-connections',
                collection: this.connections
            });
            this.connections.fetch({
                data: {type: 'connections'},
                success: function(res) {
                    // Update count on successful fetch
                    self.$el.find('.connection-count').html('(' + res.length + ')');
                    // Paginate the connections
                    self.$el.find('.connections-inner').html(contactListView.el);
                    self.$el.find(".dash-connections").addClass("clearfix").cPaginate({
                        numPerPage: 6,
                        itemSelector: '.profile-lozenge',
                        pagerPrevClass: 'cpaginate-prev pull-left',
                        pagerPrevHtml: '<img src="/img/sarrw-left.png">',
                        pagerNextClass: 'cpaginate-next pull-right',
                        pagerNextHtml: '<img src="/img/sarrw-right.png">'
                    });
                }
            });



        // Bookmarks...
            this.bookmarks = new models.Bookmarks();
            var bookmarkListView = new ContactSmallListView({
                className: 'dash-bookmarks',
                collection: this.bookmarks
            });
            this.bookmarks.fetch({
                success: function(res) {
                    // Update count on successful fetch
                    self.$el.find('.bookmark-count').html('(' + res.length + ')');
                    // How many people can we fit in the box?
                    var innerW = self.$el.find('.bookmarks-inner-paged').width();
                    var maxItems = Math.floor(innerW / 54);
                    // More items than we can fit in. Paginate them.
                    if (self.bookmarks.length > maxItems) {
                        self.$el.find('.bookmarks-inner-paged').html(bookmarkListView.el);
                        self.$el.find(".dash-bookmarks").cPaginate({
                            numPerPage: maxItems,
                            itemSelector: '.profile-lozenge-small',
                            pagerPrevEl: '#dash_bookmarks_pager_prev',
                            pagerPrevClass: 'cpaginate-prev pull-left',
                            pagerPrevHtml: '<img src="/img/sarr-left.png">',
                            pagerNextEl: '#dash_bookmarks_pager_next',
                            pagerNextClass: 'cpaginate-next pull-right',
                            pagerNextHtml: '<img src="/img/sarr-right.png">'
                        });
                    } else {
                        self.$el.find('.bookmarks-unpaged-wrapper').html(bookmarkListView.el);
                        self.$el.find('.bookmarks-paged-wrapper').hide();
                        self.$el.find('.bookmarks-unpaged-wrapper').show();
                    }
                }
            });


        // Users nearby...
            this.nearby = new models.Nearbys();
            var nearbyListView = new NearbySmallListView({
                className: 'dash-nearby',
                collection: this.nearby
            });
            this.nearby.fetch({
                success: function(res) {
                    // Update count on successful fetch
                    self.$el.find('.nearby-count').html('(' + res.length + ')');
                    // How many people can we fit in the box?
                    var innerW = self.$el.find('.nearby-inner-paged').width();
                    var maxItems = Math.floor(innerW / 54);
                    // More items than we can fit in. Paginate them.
                    if (self.nearby.length > maxItems) {
                        self.$el.find('.nearby-inner-paged').html(nearbyListView.el);
                        self.$el.find(".dash-nearby").cPaginate({
                            numPerPage: maxItems,
                            itemSelector: '.profile-lozenge-small',
                            pagerPrevEl: '#dash_nearby_pager_prev',
                            pagerPrevClass: 'cpaginate-prev pull-left',
                            pagerPrevHtml: '<img src="/img/sarr-left.png">',
                            pagerNextEl: '#dash_nearby_pager_next',
                            pagerNextClass: 'cpaginate-next pull-right',
                            pagerNextHtml: '<img src="/img/sarr-right.png">'
                        });
                    } else {
                        self.$el.find('.nearby-unpaged-wrapper').html(nearbyListView.el);
                        self.$el.find('.nearby-paged-wrapper').hide();
                        self.$el.find('.nearby-unpaged-wrapper').show();
                    }
                }
            });
        },


        onShow: function() {
            this.newsItems = new models.NewsItems();
            this.newsItemsView = new NewsItemsView({
                collection: this.newsItems
            });
            this.$el.find('.newsfeed-inner').html(this.newsItemsView.el);

            this.refreshData();
        },


        refreshData: function() {
            this.newsItems.fetch();

			// If we've come to the end of the list, remove the more button..
			this.areMoreNewsItemsToLoad(!this.newsItems.lastFetchWasFinalPage);

			this.nearby.fetch();
        },


		areMoreNewsItemsToLoad: function(areMore) {
			var uiButton = $(this.ui.btn_more_news_items);

			if(areMore) {
				uiButton.show();
			} else {
				uiButton.hide();
			}
		},


        locationToggle: function(e) {
			e.preventDefault();

            var $toggler = $('#form_toggle_location'),
                $content = $('#form_set_location');

            if ($toggler.is(':visible')) {
                $toggler.hide();
                $content.show();
            } else {
                $toggler.show();
                $content.hide();
            }
        },

        locationSet: function() {
            var self = this,
                location_name = $('input#location_name').val(),
                data = {};

            data = {
                location_name: location_name,
                latlng: null
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position, err) {
                    if (position || ! err) {
                        data.latlng = { lat: position.coords.latitude.toFixed(6), lng: position.coords.longitude.toFixed(6) };
                        self.locationSubmit(data);
                    } else {
                        self.locationSubmit(data);
                    }
                });
            } else {
                self.locationSubmit(data);
            }

        },

        /* Submit location data */
        locationSubmit: function(data) {
            var self = this;

            $.ajax('/api/v1/users/me/location', {
                type: 'put',
                dataType: 'json',
                data: data
            }).done(function() {
                self.refreshData();
                self.ui.location_name.val('');
                $(".location-name").text(data.location_name);
                overlay.alert('Your location has been updated.', function() {
                    $('#form_toggle_location').show();
                    $('#form_set_location').hide();
                });
            });
        },

        availabilityToggle: function(e) {
            e.preventDefault();

            var $toggler = $('#form_toggle_availability'),
                $content = $('#form_set_availability');

            if ($toggler.is(':visible')) {
                $toggler.hide();
                $content.show();
            } else {
                $toggler.show();
                $content.hide();
            }

        },

        availabilitySet: function() {
            var self = this,
                available = ($('input[name=available]:checked').val() == 'true' ? true : false);

            $.ajax('/api/v1/users/me/availability', {
                type: 'put',
                dataType: 'json',
                data: {
                    'available': available
                }
            }).done(function() {
                self.model.fetch();
                self.refreshData();
                $(".available-text").text((available ? 'available' : 'not available'));
                overlay.alert('Your availability has been updated.', function() {
                    $('#form_toggle_availability').show();
                    $('#form_set_availability').hide();
                });
            });
        },

        statusSet: function() {
            var self = this;

            $.post('/api/v1/users/me/status', {
                'text': $('textarea#status_text').val()
            }).done(function() {
                overlay.alert('Your status has been updated.', function() {
                    self.ui.status_text.val('');
                    self.refreshData();
                });
            });
        },

        commentToggle: function(e) {
            e.preventDefault();

            var $newsItem = $(e.currentTarget).closest(".newsitem");

            if ($newsItem.data('commenting') == true) {
                $newsItem.find('.news-comments').hide();
                $newsItem.find('.my_comment').hide();
                $newsItem.find('.my_comment_submit').hide();
                $newsItem.data('commenting', false);
            } else {
                $newsItem.find('.news-comments').show();
                $newsItem.find('.my_comment').show();
                $newsItem.find('.my_comment_submit').show();
                $newsItem.data('commenting', true);
            }
        },


        commentSubmit: function(e) {
            e.preventDefault();

            var self = this;
            var $commentWidget = $(e.currentTarget).closest('.comment_submit_widget');
            var $commentBox = $commentWidget.find('.my_comment');
            var $newsItem = $commentWidget.closest(".newsitem");

            $.post('/api/v1/news-comment', {
                parent_id: $newsItem.attr('data-id'),
                text: $commentBox.val()
            }).done(function() {
                self.refreshData();
                $commentBox.val('');
            });
        },


        loadMoreNewsItems: function(e) {
			e.preventDefault();

			var self = this;

		// Find time of last item
			var beforeTime = null;
			$.each(this.newsItems.models, function(index, item) {
				var time = item.get('time');

				if(beforeTime == null || time < beforeTime) {
					beforeTime = time;
				}
			});

            this.newsItems.fetch({
				remove: false,
				data: $.param({
					before_time: beforeTime
				}),
				success: function(res) {
					// COULDDO: [Remove duplicates here if that becomes an issue]

					// If we've come to the end of the list, remove the more button..
					self.areMoreNewsItemsToLoad(!self.newsItems.lastFetchWasFinalPage);
				}
			});
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

        commentLikeToggle: function(e) {
            e.preventDefault();

            var $comment = $(e.currentTarget).closest(".comment"),
                id = $comment.attr('data-id'),
                $likeBtn = $(e.currentTarget),
                likeCount = $likeBtn.data('count');

            if ($likeBtn.data("status") === "off") {
                // Like it
                $.post('/api/v1/news-comment/like', {
                    id: id
                }).done(function() {
                    $likeBtn
                    .data("status", "on")
                    .data("count", parseInt(likeCount, 10) + 1)
                    .trigger("refresh");
                });
            } else if ($likeBtn.data("status") === "on") {
                // Unlike it
                $.post('/api/v1/news-comment/unlike', {
                    id: id
                }).done(function() {
                    $likeBtn
                    .data("status", "off")
                    .data("count", parseInt(likeCount, 10) - 1)
                    .trigger("refresh");
                });
            }
        },

        newProject: function(e) {
            e.preventDefault();
            navigate('/projects/add');
        }

    });
});
