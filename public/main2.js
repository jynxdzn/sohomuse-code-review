// @DONOTUSE. See main.js.
require.config({
    baseUrl: '/',
    paths: {
        // SohoMuse
        navigate: 'js/main/navigate',
        vent: 'js/main/vent',
		globals: 'js/main/globals',
        'data-social': 'data/social',

        // Third-party
        text: 'bower_components/requirejs-text/text',
        jquery: 'bower_components/jquery/dist/jquery',
        'bootstrap.collapse': 'bower_components/bootstrap/js/collapse',
        'bootstrap.dropdown': 'bower_components/bootstrap/js/dropdown',
        'bootstrap.tab': 'bower_components/bootstrap/js/tab',
        'bootstrap.tooltip': 'bower_components/bootstrap/js/tooltip',
        'bootstrap.popover': 'bower_components/bootstrap/js/popover',
        bootbox: 'bower_components/bootbox/bootbox',
        underscore: 'bower_components/underscore/underscore',
        backbone: 'bower_components/backbone/backbone',
        //'backbone-relational': 'bower_components/backbone-relational/backbone-relational',
        'backbone-query-parameters-shim': 'bower_components/backbone-query-parameters/backbone.queryparams-1.1-shim',
        'backbone-query-parameters': 'bower_components/backbone-query-parameters/backbone.queryparams',
        backbonepoller: 'bower_components/backbone-poller/backbone.poller.min',
        'backbone.eventbinder': 'bower_components/backbone.eventbinder/lib/amd/backbone.eventbinder.min',
        moment: 'bower_components/moment/min/moment.min',
        marionette: 'bower_components/marionette/lib/backbone.marionette',
        sifter: 'bower_components/sifter/sifter',
        microplugin: 'bower_components/microplugin/src/microplugin',
        selectize: 'bower_components/selectize/dist/js/selectize',
        'blueimp-fileupload': 'bower_components/blueimp-file-upload/js/jquery.fileupload',
        'jquery-iframetransport': 'bower_components/blueimp-file-upload/js/jquery.iframe-transport',
        //'jquery.ui.widget': 'bower_components/blueimp-file-upload/js/vendor/jquery.ui.widget',
        fresco: 'lib/fresco/fresco',
        share: 'lib/share',
        'jquery.ui.core': 'bower_components/jquery-ui/ui/jquery.ui.core',
        'jquery.ui.mouse': 'bower_components/jquery-ui/ui/jquery.ui.mouse',
        'jquery.ui.widget': 'bower_components/jquery-ui/ui/jquery.ui.widget',
        'jquery.ui.sortable': 'bower_components/jquery-ui/ui/jquery.ui.sortable',
        'jquery.ui.datepicker': 'bower_components/jquery-ui/ui/jquery.ui.datepicker',
        imgareaselect: 'bower_components/imgareaselect/jquery.imgareaselect.dev',
        clndr: 'bower_components/clndr/clndr.min',
        cpaginate: 'lib/cpaginate',
        'magnific-popup': 'bower_components/magnific-popup/dist/jquery.magnific-popup.min',
        audiojs: 'bower_components/audiojs/audiojs/audio.min'
    },
    shim: {
        jquery: {
            exports: 'jQuery'
        },
        fresco: {
            deps: ['jquery']
        },
        'bootstrap.collapse': {
            deps: ['jquery']
        },
        'bootstrap.dropdown': {
            deps: ['jquery']
        },
        'bootstrap.tab': {
            deps: ['jquery']
        },
        'bootstrap.tooltip': {
            deps: ['jquery']
        },
        'bootstrap.popover': {
            deps: ['jquery', 'bootstrap.tooltip']
        },
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        'backbone-query-parameters-shim': {
            deps: ['backbone']
        },
        'backbone-query-parameters': {
            deps: ['backbone', 'backbone-query-parameters-shim']
        },
        backbonepoller: {
            deps: ['backbone'],
            exports: 'backbonepoller'
        },
        'backbone.eventbinder': {
            deps: ['backbone'],
            exports: 'backbone.eventbinder'
        },
        moment: {
            deps: ['jquery'],
            exports: 'moment'
        },
        marionette: {
            deps: ['jquery', 'underscore', 'backbone', 'backbone-query-parameters'],
            exports: 'Marionette'
        },
        'jquery-iframetransport': {
            deps: ['jquery', 'jquery.ui.widget'],
        },
        'blueimp-fileupload': {
            deps: ['jquery', 'jquery.ui.widget', 'jquery-iframetransport'],
        },
        'jquery.ui.core': {
            deps: ['jquery'],
        },
        'jquery.ui.mouse': {
            deps: ['jquery.ui.widget'],
        },
        'jquery.ui.widget': {
            deps: ['jquery'],
        },
        'jquery.ui.sortable': {
            deps: ['jquery.ui.core', 'jquery.ui.mouse', 'jquery.ui.widget'],
        },
        'jquery.ui.datepicker': {
            deps: ['jquery.ui.core'],
        },
        imgareaselect: {
            deps: ['jquery'],
        },
        cpaginate: {
            deps: ['jquery'],
        },
        'magnific-popup': {
            deps: ['jquery'],
        },
        clndr: {
            deps: ['jquery'],
        },
        audiojs: {
            exports: 'audiojs'
        }
    },
    packages: [{
        name: 'css',
        location: 'bower_components/require-css',
        main: 'css'
    }]
});

define(function(require) {
    var app = require('js/main/app2'),
        css = require('css!main.css');
    app.start();
});
