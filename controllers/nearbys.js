var _ = require('underscore'),
	mongoose = require('mongoose'),
	middleware = require('./../code/middleware'),
	User = mongoose.model('User');


// TODO: Switch functionality to getting nearby people...

module.exports = function(app, passport) {

    /**
     * Get other people near the request user
     *
     */
	app.get('/api/v1/nearbys/me', middleware.authenticateApi, function (req, res) {

        var distance = (req.param('distance') ? parseInt(req.param('distance')) : 80);     // distance in km

        User.findByUsername(req.user.username, function(err, user) {

            if (err) {
                return res.send({ status: 'error', reason: 'Could not load logged in user.', err: err });
            }

            User
            .find({
                geo: { $near: user.geo, $maxDistance: (distance / 111.12) },
                _id: { $ne: user._id }
            })
            .exec(function(err, nearbys) {

                if (err) {
                    return res.send({ status: 'error', reason: 'Could not load nearbys.', err: err });
                }

                nearbys = _.map(nearbys, function(user) {
                    return user.safeOut();
                });

                res.send({ status: 'ok', contacts: nearbys });
            });

        });

    });

}
