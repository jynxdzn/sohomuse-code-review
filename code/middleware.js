var passport = require('passport');

function authenticateHuman(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/login');
    }
}

function authenticateApi(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        passport.authenticate('bearer', { session: false })(req, res, next);
    }
}

module.exports = {
    authenticateHuman: authenticateHuman,
    authenticateApi: authenticateApi
}