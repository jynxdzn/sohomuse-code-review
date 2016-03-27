var fs = require("fs"),
	_ = require("underscore");


var dev = {
    bundledAssets: false,
    redis: 'redis://127.0.0.1:6379',
    mongo: 'mongodb://127.0.0.1/soho',
    foursquare: {
        client_id: 'IBYDEEANFJUPK5DWBXQGKYBSXUYOIUIOZUBIQH202IKGAXUA',
        client_secret: 'BXJNZ2GUXRGOUDIABJ0AM34VNT2FDNFSIZ2CY2CYUEMC5D3Q'
    },
    analytics: {
      ua: 'UA-59539944-1'
    },
    /*smtp: {
        host: 'localhost',
        secureConnection: false,
        port: 25
    },*/
    smtp: {
        host: 'smtp.mandrillapp.com',
        secureConnection: false,
        port: 587,
        auth: {
            user: 'umi.mcguckin@me.com',
            pass: 'fBFAesL7tJbK46QkDyCHcw'
        }
    },
	isVagrantOnPc: false		// Unfortunately, no way to tell from the hosting environment
};

var test = {
    bundledAssets: false,
    redis: 'redis://localhost:6379',
    mongo: 'mongodb://localhost/soho',
    foursquare: {
        client_id: 'IBYDEEANFJUPK5DWBXQGKYBSXUYOIUIOZUBIQH202IKGAXUA',
        client_secret: 'BXJNZ2GUXRGOUDIABJ0AM34VNT2FDNFSIZ2CY2CYUEMC5D3Q'
    },
    analytics: {
      ua: 'UA-59539944-1'
    },
    smtp: {
        host: 'soho.ikigeg.com',
        secureConnection: false,
        port: 587,
        auth: {
            user: 'alfred.soho',
            pass: 'punchmonk3y$'
        }
    },
	isVagrantOnPc: false		// Unfortunately, no way to tell from the hosting environment
};

var prod = {
    bundledAssets: true,
    redis: 'redis://localhost:6379',
    mongo: 'mongodb://localhost/soho',
    foursquare: {
        client_id: 'IBYDEEANFJUPK5DWBXQGKYBSXUYOIUIOZUBIQH202IKGAXUA',
        client_secret: 'BXJNZ2GUXRGOUDIABJ0AM34VNT2FDNFSIZ2CY2CYUEMC5D3Q'
    },
    analytics: {
      ua: 'UA-59539944-1'
    },
    smtp: {
        host: 'soho.ikigeg.com',
        secureConnection: false,
        port: 587,
        auth: {
            user: 'alfred.soho',
            pass: 'punchmonk3y$'
        }
    },
	isVagrantOnPc: false		// Unfortunately, no way to tell from the hosting environment
};

var configs = {
    development: dev,
    test: test,
    production: prod
};

var config = configs[process.env.NODE_ENV];


config.init = function(cb) {
	var self = this;

	// Load config-shim only if exists...
	var require_file = './config-shim';
	fs.exists(require_file + '.js', function(exists) {
		if (exists) {
			console.log('** Found Config Shim ***');
			_.extend(self, require(require_file)());
		}

		cb();	// Good to go!
	});
}


config.rootDir = __dirname;
config.userfilesDir = __dirname + '/userfiles';
config.publicDir = __dirname + '/public';

module.exports = config;
