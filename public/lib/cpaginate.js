/**
 * cPaginate
 *
 * Very simple pagination, suitable for tables and lists.
 * Run the plugin against a parent container and its children will be paginated.
 *
 * @author CR @ CDS
 *
 *
 * Options:
 *
 * numPerPage: number of items to show per page.
 * itemSelector: jQuery selector string for the child items that should be paginated.
 * pagerClass: class for the generated pagination elements parent.
 * pagerItemClass: class for the individual pager actions (prev/next).
 * pagerPrevEl: specify a different/existing element to contain the previous page button.
 * pagerPrevClass: class name to apply to Prev button
 * pagerPrevHtml: inner markup for pager Prev button
 * pagerNextEl: specify a different/existing element to contain the Next page button.
 * pagerNextClass: class name to apply to Next button
 * pagerNextHtml: inner markup for pager Next button
 * pagerEnabledClass: class for pager buttons that are enabled (previous not available on first page; next not available on last)
 *
 *
 * Usage:
 *
 * $(".my-items").cPaginate({ numPerPage: 11, itemSelector: '.my-item' });
 *
 */

;(function($, window, document, undefined) {

    var pluginName = "cPaginate",
        defaults = {
            numPerPage: 5,
            itemSelector: '.item',
            pagerClass: 'cpaginate-pagination',
            pagerItemClass: 'cpaginate-pager-item',
            pagerPrevEl: null,
            pagerPrevClass: 'cpaginate-prev',
            pagerPrevHtml: 'Prev',
            pagerNextEl: null,
            pagerNextClass: 'cpaginate-next',
            pagerNextHtml: 'Next',
            pagerEnabledClass: 'cpaginate-pager-enabled'
        };

    function cPaginate(element, options) {
        this.element = element;
        this.settings = $.extend({}, defaults, options);
        this.currentPage = 0;
        this.numItems = 0;
        this.$pager = null;
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    // Avoid Plugin.prototype conflicts
    $.extend(cPaginate.prototype, {

        init: function() {

            $(this.element).on('repaginate', $.proxy(this.rePaginate, this));

            this.numItems = $(this.element).find(this.settings.itemSelector).length;
            this.numPages = Math.ceil(this.numItems / this.settings.numPerPage);

            this.initPager();

            this.rePaginate();
        },

        rePaginate: function() {
            $(this.element)
                .find(this.settings.itemSelector)
                .hide()
                .slice(this.currentPage * this.settings.numPerPage, (this.currentPage + 1) * this.settings.numPerPage)
                .show();

            if (this.numPages > 1) {
                this.$prev.addClass(this.settings.pagerEnabledClass);
                this.$next.addClass(this.settings.pagerEnabledClass);

                if (this.currentPage == 0) {
                    this.$prev.removeClass(this.settings.pagerEnabledClass);
                    this.$next.addClass(this.settings.pagerEnabledClass);
                }

                if (this.currentPage == this.numPages - 1) {
                    this.$next.removeClass(this.settings.pagerEnabledClass);
                    this.$prev.addClass(this.settings.pagerEnabledClass);
                }
            }

        },

        initPager: function() {

            var self = this,
                $prev = null,
                $next = null;

            this.$pager = $('<div></div>').addClass(this.settings.pagerClass);

            // Previous button
            this.$prev = $('<div></div>')
                .addClass(this.settings.pagerItemClass)
                .addClass(this.settings.pagerPrevClass)
                .html(this.settings.pagerPrevHtml)

            if (this.settings.pagerPrevEl) {
                this.$prev.appendTo($(this.settings.pagerPrevEl));
            } else {
                this.$prev.prependTo(this.$pager);
            }

            this.$prev.on("click", function(e) {
                if (self.currentPage == 0) { return; }
                self.currentPage = self.currentPage - 1;
                self.rePaginate();
            });

            // Next button
            this.$next = $('<div></div>')
                .addClass(this.settings.pagerItemClass)
                .addClass(this.settings.pagerNextClass)
                .html(this.settings.pagerNextHtml);

            if (this.settings.pagerPrevEl) {
                this.$next.appendTo($(this.settings.pagerNextEl));
            } else {
                this.$next.appendTo(this.$pager);
            }

            this.$next.on("click", function(e) {
                if (self.currentPage == self.numPages - 1) { return; }
                self.currentPage = self.currentPage + 1;
                self.rePaginate();
            });

            this.$pager.insertAfter(this.element);
        }

    });

    $.fn[pluginName] = function(options) {
        this.each(function() {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new cPaginate(this, options));
            }
        });

        return this;
    };

})(jQuery, window, document);
