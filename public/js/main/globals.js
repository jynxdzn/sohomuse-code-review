define(function(require) {
	'use strict';

	var globals = {};

	globals.setBackgroundFromModel = function(profile) {
		var url = null;

		if (profile.get('bgimage')) {
            url = '/api/v1/files/' + profile.get('bgimage') + '/thumb?width=1920&height=1440';
		}

		this.setBackgroundWithUrl(url);
	};


// Add a global function
	globals.setBackgroundWithUrl = function(url) {

        var css = {};

		if ( typeof(url) === 'undefined' || !url) {
            css = {
                'background-image': 'url(/img/profile-default-bg.png)',
                'background-position': 'bottom left',
                'background-size': 'initial'
            }
		} else {
            css = {
                'background-image': 'url('  + url + ')',
                'background-position': 'center top',
                'background-size': 'cover'
            }
		}

		$('body').css(css);
	};

	/**
	 * KeepAlive sending function.
	 *
	 * This just sends a POST request so the application knows the user is still active.
	 * The timestamp is used to determine if email notifications should be sent on receipt of new messages (for now)
	 */
	globals.sendKeepAlive = function() {
		$.post("/noop");
	};

	globals.setBackgroundBlank = function() {
		$('body').css({ 'background-image': 'none' });
	};

    globals.wordLimit = function(origText, limit, suffix) {
        var finalText = "",
            text2 = origText.replace(/\s+/g, ' '),
            text3 = text2.split(' '),
            numberOfWords = text3.length,
            limit = limit || 5,
            suffix = suffix || '&hellip;',
            i = 0;

        if (numberOfWords > limit) {
            for (i = 0; i < limit; i++) {
                finalText = finalText + text3[i] + " ";
            }
            return finalText + suffix;
        } else {
            return origText;
        }
    };

	return globals;
});
