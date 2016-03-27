define(function(require) {

    var img_width = 180, img_height = 180;

    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        lightbox = require('fresco'),
        jquery = require('jquery'),
        magnific = require('magnific-popup'),
        audiojs = require('audiojs'),
        models = require('./../../models/models'),
        tmpl = require('text!./GalleryView.html'),
        styles = require('css!./style.gallery.css'),
        fileDetailTmpl = require('text!./GalleryFileDetailView.html');


    /**
     * File detail view (popup)
     */
    var FileDetailView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'file-detail-view white-popup-block mfp-hide',

        events: {
            'click .credit-user': 'hidePopup'
        },

        attributes: function() {
            return {
                id: 'popup_file_' + this.model.get('_id'),
            }
        },

        template: function(model) {
            return _.template(fileDetailTmpl, model);
        },

        hidePopup: function() {
            $.magnificPopup.close();
        }

    });

    /**
     * Hidden files detail view
     */
    var FilesDetailView = marionette.CollectionView.extend({
        tagName: 'div',
        className: 'files-detail',
        itemView: FileDetailView
    });




    /**
     * Single file thumbnail view
     */
    var FileView = marionette.ItemView.extend({

        tagName: 'a',
        className: 'popup-trigger',

        attributes: function() {
            var type = this.model.get('type');
            var url;
            if (type == 'local') {
                url = '/api/v1/files/' + this.model.get('_id') + '/thumb?width=800';
            }
            if (type == 'youtube') {
                url = 'http://www.youtube.com/watch?v=' + this.model.get('external_id');
            }
            if (type == 'vimeo') {
                url = 'http://vimeo.com/' + this.model.get('external_id');
            }
            return {
                href: url,
                'data-mfp-src': '#popup_file_' + this.model.get('_id')
            };
        },

        template: function(model) {
            return _.template('<img src="/api/v1/files/<%= _id %>/thumb?height=' + img_height + '&width=' + img_width + '" />', model);
        }

    });

    /**
     * Thumbnails view
     */
    var FilesView = marionette.CollectionView.extend({

        tagName: 'div',
        className: 'gallery-inner clearfix',
        itemView: FileView,
        itemViewOptions: {
            img_height: img_height,
            img_width: img_width
        },
        itemsAdded: 0,

        initialize: function() {
            var self = this;
            this.collection.on('sync', function() {
                self.initPopup();
            });
        },

        initPopup: function() {
            $('.popup-trigger').magnificPopup({
                type:'inline',
                gallery: { enabled: true },
                callbacks: {
                    // Callbacks are used to ensure videos in iframes play and stop correctly between open/close/change
                    open: function(e) {
                        var $iframe = $(this.content).find("iframe");
                        $iframe.attr('src', $iframe.data('ext-src'));
                        $iframe.css('display', 'block');
                        audiojs.events.ready(function() {
                            var as = audiojs.createAll();
                        });
                    },
                    close: function() {
                        var $iframe = $(this.content).find("iframe");
                        $iframe.attr('src', '//about:blank');
                        if (this.isIE8) {
                            $iframe.css('display', 'none');
                        }
                    },
                    beforeChange: function() {
                        var $iframe = $(this.content).find("iframe");
                        $iframe.attr('src', '//about:blank');
                        if (this.isIE8) {
                            $iframe.css('display', 'none');
                        }
                    },
                    change: function() {
                        var $iframe = $(this.content).find("iframe");
                        $iframe.attr('src', $iframe.data('ext-src'));
                        $iframe.css('display', 'block');
                    }
                }
            });
        },

        resizeMe: function() {

            var thumbWidth = this.itemViewOptions.img_width;

            var img = this.$el.find('img').toArray();
            if (img.length) {
                var width = _.reduce(img, function(sum, i) {
                    var margin = sum === 0 ? 0 : 10;
                    return sum += (margin + thumbWidth);
                }, 0);
                //this.$el.width(width);
            } else {
            }
        },

        onRender: function() {
            this.resizeMe();
        },

        onAfterItemAdded: function(view) {

            this.resizeMe();
            this.itemsAdded++;

            // For some stupid reason, at onRender(), the children are not present.
            // So, count the items as they are added; and when we have them all, attach the popup.
            if (this.itemsAdded === this.collection.length) {
                this.initPopup();
            }
        },

        onItemRemoved: function() {
            this.resizeMe();
        }

    });

    var GalleryView = marionette.ItemView.extend({

        tagName: 'div',
        className: 'gallery2',

        ui: {
            selectors: '.gal',
            all: '.gal-all',
            img: '.gal-img',
            vid: '.gal-vid',
            audio: '.gal-audio',
            doc: '.gal-doc'
        },

        events: {
            'click .gal-all': 'filterAll',
            'click .gal-img': 'filterImg',
            'click .gal-vid': 'filterVid',
            'click .gal-audio': 'filterAudio',
            'click .gal-doc': 'filterDoc'
        },

        onRender: function() {

            var f = new FilesView({
                collection: this.options.files
            });
            var f2 = new FilesDetailView({
                collection: this.options.files2
            });

            this.$el.find('.gallery-viewport').append(f.el);
            this.$el.find('.gallery-viewport-details').append(f2.el);
            f.render();
        },

        template: function() {
            return _.template(tmpl);
        },

        filterAll: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.all.addClass('active');
            this.options.files.fetch({ data: $.param({}) });
        },

        filterImg: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.img.addClass('active');
            this.options.files.fetch({ data: $.param({ type: 'images'}) });
        },

        filterVid: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.vid.addClass('active');
            this.options.files.fetch({ data: $.param({ type: 'videos'}) });
        },

        filterAudio: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.audio.addClass('active');
            this.options.files.fetch({ data: $.param({ type: 'audio'}) });
        },

        filterDoc: function (event) {
            event.preventDefault();
            this.ui.selectors.removeClass('active');
            this.ui.doc.addClass('active');
            this.options.files.fetch({ data: $.param({ type: 'document'}) });
        }
    });

    return function(username) {

        var files = new models.Files();
        var files2 = new models.Files();
        var view = new GalleryView({
            files: files,
            files2: files2
        });

        files.url = '/api/v1/gallery/' + username;
        files.fetch({
            success: function() {
                files2.add(files.toJSON());
            }
        });

        return view;
    };

});
