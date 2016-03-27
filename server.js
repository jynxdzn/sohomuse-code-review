process.env.NODE_ENV = process.env.NODE_ENV || 'development' //'production' //'test';

console.log('Running under NODE_ENV: ' + process.env.NODE_ENV);

var config = require('./config'),
    express = require('express'),
    RedisStore = require('connect-redis')(express),
    path = require('path'),
    passport = require('passport'),
    BearerStrategy = require('passport-http-bearer').Strategy,
    LocalStrategy = require("passport-local").Strategy,
    http = require('http'),
    requirejs = require('requirejs'),
    mongoose = require('mongoose'),
    RedisClient = require('./code/redis-client'),
    ua = require('universal-analytics'),
    Agenda = require('agenda'),
    crypto = require('crypto'),
    bunyan = require('bunyan');

console.log('NODE_ENV: ' + process.env.NODE_ENV);



function trackRequest(req, res, next) {
    var visitor;
    if (req.isAuthenticated()) {
        visitor = ua(config.analytics.ua, req.user.id);
    } else {
        visitor = ua(config.analytics.ua);
    }
    visitor.pageview(req.url, function() {
        next();
    });
}

var requireLoop = function(dirPath, cb) {
    require('fs').readdirSync(dirPath).forEach(function(fileName) {
        if (fileName.match(/.js$/)) {
            var filePath = (dirPath + '/' + fileName).replace('//', '/');
            var file = require(filePath);
            cb(file);
        }
    });
};

config.init(function() {
    // Optimize the javascript in the public folder and copy it to the public_build folder.
    var rjs = {
        baseUrl: __dirname + "/public/",
        mainConfigFile: __dirname + "/public/main.js",

        paths: {
            requireLib: "bower_components/requirejs/require"
        },

        name: "",
        include: ["main", "requireLib"],
        out: __dirname + "/public/main-built.js",

        preserveLicenseComments: false,
        optimizeCss: "standard",
        separateCSS: true
    };
    requirejs.optimize(rjs, function(buildResponse) {
        console.log('Successfully optimized javascript');
    });

    var app = express();

    app.configure(function() {
        app.set('port', 3000);
        app.use(express.static(path.join(__dirname, 'public')));

        app.use(ua.middleware(config.analytics.ua, {
            cookieName: '_ga'
        }));
        app.use(trackRequest);

        app.set('views', __dirname + '/views');
        app.engine('html', require('ejs').renderFile);
        app.set('view engine', 'html');

        app.set('apppath', __dirname);
      
        var d = new Date();
      
        _soho_log = bunyan.createLogger({
          name: 'SohoMuse',
          streams: [{
              path: __dirname + '/logs/sohomuse' + (d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()) + '.js'
          }]
        });

        //app.use(express.logger());
        app.use(express.logger('dev')); /* 'default', 'short', 'tiny', 'dev' */
        app.use(express.bodyParser());
        app.use(express.methodOverride());

        app.use(express.cookieParser());

        var sessionStore = new RedisStore({
            maxAge: 300000,
            client: RedisClient.Get()
        });

        app.use(express.session({
            secret: 'Our little secret',
            store: sessionStore
        }));

        app.use(passport.initialize());
        app.use(passport.session());
    });


    // Configure Mongoose connections, and register schemas
    mongoose.connect(config.mongo);

    requireLoop('./models', function(file) {
        // No need to do anything with these files
    });

    var User = mongoose.model('User');

    // Configure passport
    passport.use(User.createStrategy());

    passport.use(new BearerStrategy(
        function(token, done) {
            //			if (process.env.NODE_ENV == 'development') { return done(null, false); }

            User.findOne({
                username: token
            }, function(err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false);
                }
                return done(null, user, {
                    scope: 'all'
                });
            });
        }
    ));
  
    /**
     * Added local strategy to allow case insensitive usernames.
     */
    passport.use(new LocalStrategy(function(username, password, done) {
        
        _soho_log.info({
          username: username,
          password: password
        }, 'Attempting login');
      
        // find the user based off the username (case insensitive)
        User.findOne({
          $or: [
            { username: new RegExp('^' + username + '$', "i") },
            { emails: new RegExp('^' + username + '$', "i") }
          ]
        })
        .exec(function(err, user) {
            // if any problems, error out
            if (err) {
                _soho_log.error(err, 'Error whilst logging in as: ' + username + ' - ' + err);
                return done(err);
            }
            if (!user) {
                _soho_log.error('User does not exist: ' + username);
                return done(null, false, {
                    message: "Unknown user: " + username
                });
            }
            console.log(user.emails);
          
            // verify if the password is valid
            user.authenticate(password, function(err, isValid) {
                // if any problems, error out
                if (err) {
                    _soho_log.error(err, 'Error whilst logging in as: ' + username + ' - ' + err);
                    return done(err);
                }

                // only return the user if the password is valid
                if (isValid) {
                    _soho_log.info('Login successful: ' + username);
                    return done(null, user);
                } else {
                    _soho_log.error('Password invalid for: ' + username);
                    return done(null, false, {
                        message: "Invalid password"
                    });
                }
            });
        });
    }));

    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

    // Configure Agenda (for scheduled jobs)
    var agenda = new Agenda()
        .database(config.mongo, 'agendaJobs')
        .processEvery('5 minutes');

    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });

    requireLoop('./controllers', function(file) {
        file(app, passport, agenda);
    });

    requireLoop('./scheduled-jobs', function(file) {
        file(agenda);
    });

    require('./code/init-data');

    agenda.start();

    http.createServer(app).listen(app.get('port'), function() {
        console.log("Express server listening on port " + app.get('port'));
    });
});