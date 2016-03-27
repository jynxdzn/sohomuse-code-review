define(function(require) {
	'use strict';

    var _ = require('underscore'),
        backbone = require('backbone');
   
    return function(url, params) {
        if (params) {
            url += '?' + _.pairs(params).map(function (pair) { return pair[0] + '=' + pair[1]; }).join('&');
        }
        backbone.history.navigate(url, { trigger: true});
    };

});