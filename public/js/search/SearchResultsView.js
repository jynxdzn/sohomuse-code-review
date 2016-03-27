define(function(require) {

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        vent = require('vent'),
        globals = require('globals'),
        navigate = require('navigate'),
        equalize = require('equalize'),
        models = require('./../models/models'),
        tmpl = require('text!./SearchResultsView.html'),
        userTmpl = require('text!./UserView.html'),
        filterTmpl = require('text!./FilterView.html'),
        styles = require('css!./style');


    var FilterView = marionette.ItemView.extend({
        tagName: 'div',
        //className: '',
        template: function(model) {
            return _.template(filterTmpl, model);
        }
    });

    var UserView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'col-xs-6 col-sm-6 col-md-4 col-lg-3 result-user',

        events: {
            'click .view-user': 'preview'
        },

        template: function(model) {
            return _.template(userTmpl, model);
        },

        preview: function(e) {
            e.preventDefault();
            vent.trigger("search:preview", { username: this.model.get('username') });
        }
    });


    var UsersView = marionette.CollectionView.extend({
        className: 'row search-results-container',
        itemView: UserView,
        onRender: function() {
            $(".search-results-container").equalize({ reset: true });
        }
    });


    return marionette.Layout.extend({

        tagName: 'div',

        className: 'search-results',

        ui: {
            q: '#q',
            filter_form: '.filter-form',
            sort: '.search-sort',
            btnToggle: '.js-toggle-filters',
            filterContainer: '.filter-container'
        },

        events: {
            'submit .filter-form': 'applyFilter',
            'change .filter-element': 'applyFilter',
            'click .filter-caption': 'toggleFilterItems',
            'change .search-sort': 'applySort',
            'click @ui.btnToggle': 'toggleFilter'
        },

        regions: {
            'results': '.results-container',
            'filter': '.filter-container'
        },

        filterValues: null,

        onBeforeRender: function() {
            this.model = new backbone.Model(this.options);
            this.users = new models.Users([]);
            this.fetch();
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        onShow: function() {
            $(".pane-wrapper > .profile-nav, .pane-wrapper > .profile-summary-box").remove();
        },

        onRender: function() {

            var self = this;

            if ( ! this.view) {
                this.view = new UsersView({ collection: this.users });
            }

            this.view.render();
            this.results.show(this.view);

            $(".pane-wrapper > .profile-nav, .pane-wrapper > .profile-summary-box").remove();
        },

        fetch: function() {

            var self = this;

            if (typeof this.options.params == 'undefined') {
                this.options.params = {};
            }

            this.users.fetch({
                data: $.param(this.options.params),
                success: function() {

                    /*
                    This code can be used to duplicate users.
                    More users in results is helpful when more results are needed to test design features...

                    var user1 = {};
                    _.each(self.users.models, function(usr) {
                        user1 = usr.toJSON();
                        delete user1.id;
                        delete user1._id;
                        self.users.add(new models.User(user1));
                        self.users.add(new models.User(user1));
                    });*/

                    self.buildFilter();
                }
            });
        },

        /**
         * Based on the returned values, build a filter form
         *
         */
        buildFilter: function() {

            // For all the results, build up the list of attributs and params
            var value = null,
                self = this;

            this.filterValues = {
                'Country': [],
                'City': [],
                'Occupation': [],
                'Accents': [],
                'Languages': [],
                'Performance Skills': [],
                'Athletic Skills': []
            };

            this.users.each(function(user) {

                // Country
                value = user.get('country');
                if (_.indexOf(self.filterValues['Country'], value) === -1 && value.length > 0) {
                    self.filterValues['Country'].push(user.get('country'));
                }

                // City
                value = user.get('city');
                if (_.indexOf(self.filterValues['City'], value) === -1 && value.length > 0) {
                    self.filterValues['City'].push(value);
                }

                // Occupation
                value = (user.get('career') && user.get('career').occupation ? user.get('career').occupation : "");
                if (_.indexOf(self.filterValues['Occupation'], value) === -1 && value.length > 0) {
                    self.filterValues['Occupation'].push(value);
                }

                value = user.get('skills').occupations;
                _.each(value, function(val) {
                    if (_.indexOf(self.filterValues['Occupation'], val) === -1 && val.length > 0) {
                        self.filterValues['Occupation'].push(val);
                    }
                });

                // Accents
                value = user.get('skills').accents;
                _.each(value, function(val) {
                    if (_.indexOf(self.filterValues['Accents'], val) === -1 && val.length > 0) {
                        self.filterValues['Accents'].push(val);
                    }
                });

                // Languages
                value = user.get('skills').languages;
                _.each(value, function(val) {
                    if (_.indexOf(self.filterValues['Languages'], val) === -1 && val.length > 0) {
                        self.filterValues['Languages'].push(val);
                    }
                });

                // Performance skills
                value = user.get('skills').performance;
                _.each(value, function(val) {
                    if (_.indexOf(self.filterValues['Performance Skills'], val) === -1 && val.length > 0) {
                        self.filterValues['Performance Skills'].push(val);
                    }
                });

                // Athletic skills
                value = user.get('skills').athletic;
                _.each(value, function(val) {
                    if (_.indexOf(self.filterValues['Athletic Skills'], val) === -1 && val.length > 0) {
                        self.filterValues['Athletic Skills'].push(val);
                    }
                });

            });

            if (this.users.length > 1) {
                var m = new Backbone.Model({ filter: this.filterValues });
                this.filter.show(new FilterView({ model: m }));
            } else {
                this.filter.close();
            }

        },

        applyFilter: function() {

            var filtered = this.users,
                els = null,
                self = this,
                filter = {
                    'Country': [],
                    'City': [],
                    'Occupation': [],
                    'Accents': [],
                    'Languages': [],
                    'Performance Skills': [],
                    'Athletic Skills': []
                };

            _.each(this.filterValues, function(items, caption) {

                els = self.filter.$el.find("[data-caption='" + caption + "']:checked");

                $.each(els, function(idx, el) {
                    filter[caption].push($(this).val());
                });

            });

            if (filter['Country'].length > 0) {
                filtered = filtered.byCountry(filter['Country']);
            }

            if (filter['City'].length > 0) {
                filtered = filtered.byCity(filter['City']);
            }

            if (filter['Occupation'].length > 0) {
                filtered = filtered.byOccupation(filter['Occupation']);
            }

            if (filter['Accents'].length > 0) {
                filtered = filtered.byAccent(filter['Accents']);
            }

            if (filter['Languages'].length > 0) {
                filtered = filtered.byLanguage(filter['Languages']);
            }

            if (filter['Performance Skills'].length > 0) {
                filtered = filtered.byPerformance(filter['Performance Skills']);
            }

            if (filter['Athletic Skills'].length > 0) {
                filtered = filtered.byAthletic(filter['Athletic Skills']);
            }

            this.view.collection = filtered;

            this.view.collection.changeSort(this.ui.sort.val());
            this.view.collection.sort();

            this.view.render();
        },

        toggleFilterItems: function(e) {
            var filter = $(e.currentTarget).data('filter'),
                $items = $('.filter-items[data-filter="' + filter + '"]'),
                $icon = $(e.currentTarget).children('.glyphicon');

            if ($items.is(':visible')) {
                $items.hide();
                $icon.removeClass('is-open');
            } else {
                $items.removeClass('initial_hide');
                $items.show();
                $icon.addClass('is-open');
            }
        },

        toggleFilter: function(e) {
            e.preventDefault();
            if (this.ui.filterContainer.is(":visible")) {
                // Message list is currently visible
                // Hide message list, show detail
                this.ui.filterContainer.addClass("hidden-xs");
            } else {
                // Show filter container
                this.ui.filterContainer.removeClass("hidden-xs");
            }
        },

        applySort: function(e) {
            this.view.collection.changeSort(this.ui.sort.val());
            this.view.collection.sort();
            this.view.render();
        }

    });


});
