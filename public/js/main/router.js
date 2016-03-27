define(function(require,app) {
    'use strict';

    var marionette = require('marionette'),
        navigate = require('navigate'),
        backbone = require('backbone'),
        vent = require('vent'),
        globals = require('globals'),
        overlay = require('./../overlay/overlay');

    var models = require('./../models/models');

    var ProfileMiniView = require('./../profile/ProfileMiniView'),
        AboutView = require('./../profile/widgets/AboutView'),
        GalleryView = require('./../profile/widgets/GalleryView'),
        ProjectsView = require('./../profile/widgets/ProjectsView'),
        ProjectView = require('./../profile/widgets/ProjectView'),
        RepresentationView = require('./../profile/widgets/RepresentationView'),
        ImageSelectorView = require('./../image_selector/ImageSelectorView'),
        DashboardView = require('./../dashboard/DashboardView'),
        ContactsView = require('./../contacts/ContactsView'),
        ProjectListView = require('./../projects/ProjectsListView'),
        EditProjectView = require('./../edit_project/EditProjectView'),
        NetworkView = require('./../network/NetworkView'),
        EditProfileView = require('./../edit_profile/EditProfileView'),
        AddContactView = require('./../add_contact/AddContactView'),
        EditContactView = require('./../edit_contact/EditContactView'),
        FilesView = require('./../files/FilesView'),
        FileDetailsView = require('./../files/FileDetailsView'),
        MessagesView = require('./../messages/MessagesView'),
        NotificationsView = require('./../notifications/NotificationsView'),
        SearchResultsView = require('./../search/SearchResultsView'),
        CalendarView = require('./../calendar/CalendarView'),
        ConnectionsFullView = require('./../connections/ConnectionsFullView'),
        PaneView = require('./../pane/PaneView');

    var profile = new models.Profile({ username: this_user.username });
    var paneView = new PaneView();
    var loadedProfile = null;
    var loadedProfileView = null;

    return marionette.AppRouter.extend({
        routes: {
            '': 'profile',
            'user/:username': 'profile_other',
            'user/:username/:page': 'profile_other',
            'user/:username/:page/:param': 'profile_other',
            'dashboard': 'dashboard',
            'edit': 'edit_profile',
            'add': 'add_contact',
            'image': 'image',
            'contact/:id': 'edit_contact',
            'invite': 'invite',
            'bcard': 'bcard',
            'remind': 'remind',
            'contacts': 'contacts',
            'projects': 'projects',
            'projects/add': 'add_project',
            'projects/:id': 'edit_project',
            /*'user/:username/projects': 'view_project',
            'user/:username/projects/:id': 'view_project',*/
            'files': 'files',
            'files/:id': 'fileDetails',
            'messages': 'messages',
            'messages/:id': 'messageDetails',
            'network': 'network',
            'search': 'search'
        },

        setPaneView: function(opts) {

            var self = this;

            $('body').removeClass('scrollable');

/*            console.log("setPaneView");
            console.log(opts);
            console.log("paneView");
            console.log(paneView);*/

            if (paneView.isClosed || paneView.isClosed !== false || paneView.isClosed === undefined) {
                // console.log("paneView is closed. Show()");
                self.options.app.mainRegion.show(paneView);
            } else {
                // console.log("paneView is not closed. attachView()");
                self.options.app.mainRegion.attachView(paneView);
            }

            /*console.log("opts");
            console.log(opts);*/

            if (opts && opts.content && opts.content !== null) {
                // console.log("content is present - showing");
                if (opts.content.isClosed || opts.content.isClosed !== false || opts.meta.isClosed === undefined) {
                    paneView.content.show(opts.content);
                } else {
                    paneView.content.attachView(opts.content);
                }
            } else if (opts && opts.content === null) {
                // console.log("content is null - closing");
                paneView.content.close();
            }

            if (opts && opts.meta && opts.meta !== null) {
                /*console.log("meta is present - showing");
                console.log(opts.meta);*/
                if (opts.meta.isClosed || opts.meta.isClosed !== false || opts.meta.isClosed === undefined) {
                    paneView.meta.show(opts.meta);
                } else {
                    paneView.meta.attachView(opts.meta);
                }
            } else if (opts && opts.meta === null) {
                //console.log("meta is null - closing");
                paneView.meta.close();
            }
        },

        profile: function (param) {

            var self = this,
                view = null,
                profile = new models.Profile({ me: true });

            profile.fetch({
                success: function () {
                    loadedProfile = profile;
                    view = new ProfileMiniView({ model: profile });
                    loadedProfileView = view;
                    self.setPaneView({ meta: loadedProfileView, content: null });
                    paneView.setFrost(false);
                }
            });
        },

        image: function(params) {

            var self = this,
                view = null,
                profile = new models.Profile({ me: true });

            profile.fetch({
                success: function () {

                    // Got profile. Load image selector in meta pane
                    loadedProfile = profile;

                    view = new ImageSelectorView({
						params: params,
						profileImageSubmitUrl: '/api/v1/files/upload',
                        select: function(file) {
                            var url = '/api/v1/files/' + file.attributes._id + '/thumb?width=1920&height=1440';
                            globals.setBackgroundWithUrl(url);
                        },
                        save: function(file) {
                            // Saving the image
                            loadedProfile.save({ bgimage: file.attributes._id }, {
                                patch: true,
                                success: function() {
//                                    navigate('');	- temporarily removed - seemed like odd UI for uploads
									overlay.alert('Your new profile image has been saved.');
                                }
                            });
                        },
                        cancel: function() {
                            navigate('');
                        }
                    });

                    self.setPaneView({ meta: view, content: null });
                    globals.setBackgroundFromModel(loadedProfile);
                }
            });

        },

        profile_other: function (username, page, params) {
          
          username = encodeURIComponent(username);
          
            var self = this,
                view = null,
                profile = null;

            // No page specified? Make sure content area is emptied
            if ( ! page) {
                self.setPaneView({ content: null });
                paneView.setFrost(false);
            }

            // If there is no profile loaded already, or the requested username is *different* from the loaded, profile, we need to get it
            if (loadedProfile == null || loadedProfile.get('username') !== username) {

                profile = new models.Profile({ me: false, username: username });

                profile.fetch({
                    success: function () {

                        // Update the loadedProfile variable with the profile we just got
                        loadedProfile = profile;

                        // Create a view for the profile
                        loadedProfileView = new ProfileMiniView({ model: profile });

                        // Put the view in the layout
                        self.setPaneView({ meta: loadedProfileView });

                        // Track profile views
                        loadedProfileView.trackProfileView();

                        // Do additional pages
                        paneView.setFrost(false);
                        self.profile_page(username, page, params);
                    },
                    error: function () {
                        navigate('/');
                    }
                });

            } else {

                // Profile is already loaded! No need to refetch it

                // Create a view for the profile & update the layout
                //view = new ProfileMiniView({ model: loadedProfile });
                self.setPaneView({ meta: loadedProfileView });

                // Handle additional page loads
                self.profile_page(username, page, params);

            }

        },

        // Handle additional profile page loading (about/media/connections etc)
        profile_page: function(username, page, param) {

            var self = this;

            if ( ! page) {
                paneView.setFrost(false);
            } else {
                paneView.setFrost(true);
            }

            switch (page) {

                case 'about':
                    self.setPaneView({ content: new AboutView({ model: loadedProfile }) });
                break;

                case 'media':
                    self.setPaneView({ content: GalleryView(loadedProfile.get('username')) });
                break;

                case 'projects':
                    if (param) {
                        var project = new models.Project({ _id: param });
                        project.fetch({
                            success: function() {
                                self.setPaneView({ content: new ProjectView({ model: project }) });
                            }
                        });
                    } else {
                        self.setPaneView({ content: ProjectsView(loadedProfile.get('username')) });
                    }
                break;

                case 'contacts':
                    self.setPaneView({ content: new RepresentationView({ model: loadedProfile }) });
                break;

                case 'calendar':
                    self.setPaneView({ content: new CalendarView(username, 'large') });
                break;

                case 'connections':
                    var connections = new models.Contacts();

                    if (param == 'all') {
                        connections.url = '/api/v1/users/username/' + username + '/connections';
                    } else if (param == 'mutual') {
                        connections.url = '/api/v1/users/username/' + username + '/mutual';
                    } else if (param == 'endorsements') {
                        connections.url = '/api/v1/user-endorsements/username/' + username;
                    }

                    connections.fetch({
                        success: function(res) {
                            var view = new ConnectionsFullView({
                                user: loadedProfile,
                                type: param,
                                connections: res
                            });
                            self.setPaneView({ content: view });
                        }
                    });

                break;

                default:
                    // No default
            }
        },

        edit_profile: function () {
            var self = this;

            var profile = new models.Profile({me: true});
            profile.fetch({
                success: function () {
                    $('body').addClass('scrollable');
                    self.options.app.mainRegion.show(new EditProfileView({ model: profile }));
                }
            });
        },

        dashboard: function () {
            var self = this;
            profile.fetch({
                success: function () {
                    $('body').removeClass('scrollable');
                    var view = new DashboardView({ model: profile });

                    self.options.app.mainRegion.show(view);
                }
            });
        },

        contacts: function(params) {
            $('body').addClass('scrollable');
            this.options.app.mainRegion.show(new ContactsView({ params: params }));
        },

        add_contact: function () {
            //this.options.app.mainRegion.show(new AddContactView());
            overlay.show(new AddContactView());
        },

        edit_contact: function(id, params) {
            var self = this;
            var contact = new models.Contact({ _id: id });
            contact.fetch({
                success: function() {
                    self.options.app.mainRegion.show(new EditContactView({ model: contact, params: params }));
                }
            });
        },

        projects: function(params) {
            this.options.app.mainRegion.show(new ProjectListView({ params: params }));
            $('body').addClass('scrollable');
        },

        add_project: function() {
            $('body').addClass('scrollable');
            var project = new models.Project();
            this.options.app.mainRegion.show(new EditProjectView({ model: project }));
        },

        edit_project: function(id) {
            var self = this;
            var project = new models.Project({ _id: id });
            project.fetch({
                success: function() {
                    $('body').addClass('scrollable');
                    self.options.app.mainRegion.show(new EditProjectView({ model: project }));
                }
            });
        },

        network: function (params) {
            this.options.app.mainRegion.show(new NetworkView({ params: params }));
        },

        files: function(params) {
            $('body').addClass('scrollable');
            this.options.app.mainRegion.show(new FilesView({ params: params }));
        },

        fileDetails: function(id, params) {
			var self = this;
            var file = new models.File({ _id: id });
            file.fetch({
                success: function() {
                    $('body').addClass('scrollable');
                    var view = new FileDetailsView({ model: file });
                    self.options.app.mainRegion.show(view);

                    if(params && params.action == 'add-art') {
                        view.chooseArt();
                    }
                }
            });
        },

        messages: function(params) {
            var self = this;

            var messages = new models.MessagesIndex();
            messages.fetch({
                data: $.param({
                    type: 'message'
                }),
                success: function() {
                    $('body').addClass('scrollable');
                    self.options.app.mainRegion.show(new MessagesView({ collection: messages, params: params }));
                }
            });
        },

        messageDetails: function(id) {
            var self = this;
            var messages = new models.MessagesIndex();
            messages.fetch({
                data: $.param({
                    type: 'message'
                }),
                success: function() {
                    $('body').addClass('scrollable');
                    self.options.app.mainRegion.show(new MessagesView({ collection: messages, showMessage: id }));
                }
            });
        },

        search: function (params) {

            var self = this,
                searchResultsView = new SearchResultsView({ params: params });

            self.setPaneView({
                content: searchResultsView
            });

            paneView.setFrost(true);

            // No profile loaded? Load yourself into the sidebar
            if (loadedProfile === null) {
                var profile = new models.Profile({ me: true });

                profile.fetch({
                    success: function () {
                        loadedProfile = profile;
                        loadedProfileView = new ProfileMiniView({ model: profile, mode: "search" });
                        self.setPaneView({ meta: loadedProfileView });
                    }
                });
            }

            //$(".pane-wrapper > .profile-nav:visible, .pane-wrapper > .profile-summary-box:visible").remove();

            // The search module will trigger a search:preview event when a user is clicked.
            // We listen to this and load the profile mini view in the pane view meta region.
            vent.on("search:preview", function(data) {
                if (data.username) {
                    var profile = new models.Profile({ me: false, username: data.username });
                    profile.fetch({
                        success: function() {
                            var profileView = new ProfileMiniView({ model: profile, mode: 'search' });
                            self.setPaneView({
                                meta: profileView,
                            });
                        }
                    });
                }
            });
        }

    });
});
