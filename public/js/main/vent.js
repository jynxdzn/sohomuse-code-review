define(function(require){
	'use strict';

    var backbone = require('backbone'),
        marionette = require('marionette');
        
    return new backbone.Wreqr.EventAggregator();
});