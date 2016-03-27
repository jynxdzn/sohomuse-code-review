define(function(require) {
    var bcard = require('./bcard'),
    	contacts = require('./contacts'),
    	projects = require('./projects'),
    	files = require('./files'),
    	messages = require('./messages'),
    	news = require('./news'),
    	notifications = require('./notifications'),
    	profile = require('./profile'),
    	user = require('./user');

    return _.extend(bcard, notifications, contacts, projects, files, messages, news, profile, user);
});