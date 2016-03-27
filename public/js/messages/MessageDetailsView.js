define(function(require) {

    var models = require('./../models/models'),
        backbone = require('backbone'),
        vent = require('vent'),
        marionette = require('marionette'),
        _ = require('underscore'),
        tmpl = require('text!./MessageDetailsView.html'),
		itemTmpl = require('text!./MessageDetailsItemView.html'),
		emailItemTmpl = require('text!./EmailDetailsItemView.html'),
		ReplyMessageView = require('./../messages_create/ReplyMessageView');

	var MessageDetailsItemView = marionette.ItemView.extend({

		className: 'media',
        template: function(model) {
			if(model.messageType=="email"){
				return _.template(emailItemTmpl, model);
			} else {
				return _.template(itemTmpl, model);
			}
        }

    });

    var MessageDetailsView = marionette.CollectionView.extend({
        itemView: MessageDetailsItemView,

        attributes: {
            style: 'margin-top:30px'
        },

        appendHtml: function(collectionView, itemView){
            collectionView.$el.prepend(itemView.el);
        }
    });

    return marionette.Layout.extend({

        tagName: 'div',

        className: 'messageDetails',

        // Message item pagination position & items
        curPage: 1,
        perPage: 4,
        moreItems: false,

        events: {
            'click .save' : 'saveMe',
            'click .replyToggle' : 'replyToggle',
            'click .btn-more': 'loadMore'
        },

        ui: {
            'more': '.btn-more'
        },

		regions: {
			messageDetails : '.messageDetails',
			messageReplies : '.messageReplies',
			messageNewReply : '.messageNewReply'
		},

        template: function(model) {
        	return _.template(tmpl, model);
        },

        initialize: function() {

            var self = this;

            vent.on('message:replySent', function(msgModel) {

                // On reply sent, reset the messages to be the most recent ones.
                self.collection.fetch({
                    reset: true,
                    data: $.param({
                        type: 'messageCollection',
                        parentId: self.options.parentMsg.id,
                        sort: 'desc',
                        take: self.perPage,
                        skip: 0
                    }),
                    success: function() {
                        // New list of messages loaded after reply sent. Reset pagination stuff
                        self.curPage = 1;
                        self.toggleLoadMore();
                    }
                });

            });
        },

        onRender: function() {

            var self = this;

            var messageDetailsView = new MessageDetailsView({
                collection: this.collection
            });

			this.messageReplies.show(messageDetailsView);

			var msgids = _.map(this.collection.models, function(m){
				return m.attributes._id;
			});

			vent.trigger('notifications:messageOpened', msgids);

            // On load, toggle the loadMore button visibility
            self.toggleLoadMore();

			this.messageNewReply.show(new ReplyMessageView({ model: this.model, parentMsg: this.options.parentMsg }));
        },


        /**
         * Toggle the "load more" button visibility, based on the number of messages in view.
         *
         * If the number of items in the collection is equal to or more than the number of items per page.
         *
         */
        toggleLoadMore: function() {
            this.moreItems = (this.collection.length >= this.perPage);
            if (this.moreItems) {
                this.ui.more.show();
            } else {
                this.ui.more.hide();
            }
        },


        saveMe: function() {
            this.model.save();
        },


        /**
         * Load more items!
         *
         */
        loadMore: function(e) {

            e.preventDefault();

            var self = this;

            if ( ! self.moreItems) return;

            var msgs = new models.Messages();

            msgs.fetch({
                reset: true,
                data: $.param({
                    type: 'messageCollection',
                    parentId: self.model.attributes.parentId,
                    sort: 'desc',
                    take: self.perPage,
                    skip: self.curPage * self.perPage
                }),
                success: function(res) {
                    // Set min height on parent element.
                    // This is to prevent the page *appearing* to scroll back to the top between re-rendering the messages.
                    self.$el.css({ "min-height": self.$el.height() + "px" });
                    // Add our new messages to the main collection
                    self.collection.add(msgs.models);
                    self.collection.sort();
                    // sort requires a re-render for them to all be displayed in the correct order
                    self.render();
                    // Increment the "page number" counter
                    self.curPage++;
                    // If the number of items returned is less than the number of items per page, there is likely no more to get.
                    // Update flag and hide the "load more" button.
                    if (res.length < self.perPage) {
                        self.moreItems = false;
                        self.ui.more.hide();
                    }
                }
            });
        },


        replyToggle: function() {
        	/*var ele = this.$el.find('.messageNewReply textarea');
        	setTimeout(function() {
            	ele.focus();
            	window.scrollTo(0, document.body.scrollHeight);
        	}, 20);*/
        },


        toggleReplyVisible: function() {
        	/*var self = this,
        		lastMsg = self.collection.first();

            if (window.this_user.id == lastMsg.get('owner')._id) {
				self.$el.addClass("no-reply");
			} else {
				self.$el.removeClass("no-reply");
			}*/
        }


    });
});
