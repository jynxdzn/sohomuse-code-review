var passport = require("passport"),
    LocalStrategy = require("passport-local").Strategy,
    mongoose = require("mongoose"),
    User = mongoose.model("User");

// The strategy used when authenticating a user
passport.use(new LocalStrategy(function(username, password, done) {
    // find the user based off the username (case insensitive)
    User.findOne({
        username: new RegExp(username, "i")
    }).select("+password").exec(function(err, user) {
        // if any problems, error out
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false, {
                message: "Unknown user: " + username
            });
        }
 
        // verify if the password is valid
        user.isPasswordValid(password, function(err, isValid) {
            // if any problems, error out
            if (err) {
                return done(err);
            }
 
            // only return the user if the password is valid
            if (isValid) {
                return done(null, user);
            } else {
                return done(null, false, {
                    message: "Invalid password"
                });
            }
        });
    });
}));