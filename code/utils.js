var config = require('./../config'),
    path           = require('path'),
    templatesDir   = path.resolve(__dirname, '../templates'),
    emailTemplates = require('email-templates'),
    nodemailer     = require('nodemailer'),
    http = require('http'),
    fs = require('fs'),
    dfl = require('date-format-lite');

var logfile = {
    fs: null,
    date: null
};

function cleanArray(actual) {
  var newArray = new Array();
  for(var i = 0; i<actual.length; i++){
      if (actual[i]){
        newArray.push(actual[i]);
    }
  }
  return newArray;
}

function downloadFile(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    });
}

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP", config.smtp);

// cb: function(err, responseStatus)
function sendEmail(params, cb) {
	// If we're in development, don't send anything to (anyone)@sohomuse.com
	/* TODO: Fix this - looks like NODE_ENV is 'development' also on the production machine :(
	if(process.env.NODE_ENV == 'development') {		
		if(params.email.match(/@sohomuse.com$/i)) {
			console.log('Dev only - system requested an email to ' + params.email + ' but this request has been skipped');
			
			// Faked a successful response...
			return cb(null, {
				message: '250 2.0.0 Ok: queued as 99999999999',
				messageId: '999999999999999999999999999999@quantal64',
			});
		}
	}
	*/
	
    emailTemplates(templatesDir, function(err, template) {
        if (err) {
            console.log("emailTemplates err:", err);
			return cb(err);
        }

		logMessage("sendEmail");
		logMessage(params);

		template(params.template, params.model, function(err, html, text) {
			if(err) {
				console.log(err);
				return cb(err);
			}

			var emailFrom = params.emailFrom || 'SohoMuse <no-reply@sohomuse.com>';

			//console.log(html);
			//console.log("params.model",params.model);
			//console.log("emailFrom",emailFrom);
			//console.log("params.email",params.email);

			var emailOptions = {
				from: emailFrom,
				to: params.email,
				subject: params.subject,
				html: html,
				text: text
			};

			emailOptions.attachments = params.attachments || null;

			smtpTransport.sendMail(emailOptions, cb);
        });
    });
}

/**
 * Crude logging of stuff to a file.
 *
 * utils.logMessage("foo"); -> append to ./logs/log-YYYY-MM-DD.log prefixed with datetime
 *
 * @param  mixed text String|object|array of thing to log
 *
 */
function logMessage(text) {

    var dt = new Date();
    var dtFormat = dt.format("YYYY-MM-DD");

    if (logfile.fs === null || logfile.date !== dtFormat) {

        // Do initial one
        logfile.date = dtFormat;

        var path = config.rootDir + '/.logs/log-' + dtFormat + '.log';
        logfile.fs = fs.createWriteStream(path, {'flags': 'a'});

        logfile.fs.on('error', function (err) {
            console.log(err);
            console.log(text);
        });
    }

    // fs is already set up

    if (typeof text !== "string") {
        text = JSON.stringify(text, null, "\t");
    }

    logfile.fs.write("[" + dt.format("YYYY-MM-DD hh:mm:ss") + "] " + text + "\n");
}


function createUserCode(length) {
	var text = "";
	var possible = "ACDEFGHJKMNPQRTUVWXYZ234679";

	for(var i = 0; i < length; i ++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));	
	}

	return text;
}


module.exports = {
    downloadFile: downloadFile,
    sendEmail: sendEmail,
    logMessage: logMessage,
	createUserCode: createUserCode,
  cleanArray: cleanArray
};
