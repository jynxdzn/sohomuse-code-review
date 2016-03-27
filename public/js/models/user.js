define(function(require) {
    var backbone = require('backbone');

    var User = backbone.Model.extend({
        defaults: {
            _id: null,
            firstName: null,
            lastName: null,
            username: null,

            country: 'United States',
            city: '',

            counts: {
                connections: 0,
                views: 0
            },

            added: null
        }
    });


    var Users = backbone.Collection.extend({

        model: User,

        selectedStrategy: "firstName",

        initialize: function(models, options) {
            if (options) {
                this.username = options.username;
            }
        },

        url: function() {
            if (this.username) {
                return '/api/v1/users/username/' + this.username + '/connections';
            } else {
                return '/api/v1/users/';
            }
        },

        // Filter: by country
        byCountry: function(country) {
            filtered = this.filter(function(user) {
                return _.indexOf(country, user.get('country')) !== -1;
            });
            return new Users(filtered);
        },

        // Filter: by city
        byCity: function(city) {
            filtered = this.filter(function(user) {
                return _.indexOf(city, user.get('city')) !== -1;
            });
            return new Users(filtered);
        },

        // Filter: by occupation
        byOccupation: function(occupation) {
            filtered = this.filter(function(user) {
                matches = 0;
                var userOcc = (user.get('career') && user.get('career').occupation ? user.get('career').occupation : "");
                if (_.indexOf(occupation, userOcc) !== -1) {
                    matches++;
                }
                for (i = 0; i <= occupation.length; i++) {
                    if (_.indexOf(user.get('skills').occupations, occupation[i]) !== -1) {
                        matches++;
                    }
                }
                return matches > 0;
            });
            return new Users(filtered);
        },

        // Filter: by accent
        byAccent: function(accent) {
            var i = 0,
                matches = 0;

            filtered = this.filter(function(user) {
                matches = 0;
                for (i = 0; i <= accent.length; i++) {
                    if (_.indexOf(user.get('skills').accents, accent[i]) !== -1) {
                        matches++;
                    }
                }
                return matches > 0;
            });
            return new Users(filtered);
        },

        // Filter: by language
        byLanguage: function(language) {
            var i = 0,
                matches = 0;

            filtered = this.filter(function(user) {
                matches = 0;
                for (i = 0; i <= language.length; i++) {
                    if (_.indexOf(user.get('skills').languages, language[i]) !== -1) {
                        matches++;
                    }
                }
                return matches > 0;
            });
            return new Users(filtered);
        },

        // Filter: by performance
        byPerformance: function(performance) {
            var i = 0,
                matches = 0;

            filtered = this.filter(function(user) {
                matches = 0;
                for (i = 0; i <= performance.length; i++) {
                    if (_.indexOf(user.get('skills').performance, performance[i]) !== -1) {
                        matches++;
                    }
                }
                return matches > 0;
            });
            return new Users(filtered);
        },

        // Filter: by athletic
        byAthletic: function(athletic) {
            var i = 0,
                matches = 0;

            filtered = this.filter(function(user) {
                matches = 0;
                for (i = 0; i <= athletic.length; i++) {
                    if (_.indexOf(user.get('skills').athletic, athletic[i]) !== -1) {
                        matches++;
                    }
                }
                return matches > 0;
            });
            return new Users(filtered);
        },

        strategies: {
            firstName: function (user) { return user.get("firstName"); },
            lastName: function (user) { return user.get("lastName"); },
            city: function (user) { return user.get("city"); },
            id: function (user) { return user.get("id"); }
        },

        changeSort: function (sortProperty) {
            this.comparator = this.strategies[sortProperty];
        }

    });

    return {
        User: User,
        Users: Users
    };

});
