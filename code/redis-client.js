var config = require('./../config');

var REDIS_CLIENT = null;

module.exports.Get = function() {
	if(REDIS_CLIENT) {
		return REDIS_CLIENT;
	}

    var rtg = require('url').parse(config.redis);
    REDIS_CLIENT = require('redis').createClient(rtg.port, rtg.hostname);
    if (rtg.auth) {
        REDIS_CLIENT.auth(rtg.auth.split(':')[1]); 
    }
	
	return REDIS_CLIENT;
}