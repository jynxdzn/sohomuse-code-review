define(function(require) {

	var models = require('./../models/models'),
		backbone = require('backbone'),
		vent = require('vent'),
		marionette = require('marionette'),
		_ = require('underscore'),
		jquery = require('jquery'),
		globals = require('globals'),
		overlay = require('./../overlay/overlay'),
		tmpl = require('text!./MessagesView.html'),
		messageTmpl = require('text!./MessageView.html'),
		emailTmpl = require('text!./EmailView.html'),
		NewMessageView = require('./../messages_create/NewMessageView'),
		MessageDetailsView = require('./MessageDetailsView'),
		styles = require('css!./style');

/* Single Message View */

	var MessageView = marionette.ItemView.extend({
		tagName: 'a',

		className: 'list-group-item',

		attributes: function() {
			return {
				'data-id': this.model.get('_id')
			};
		},

		template: function(model) {
			if(model.messageType=="email"){
				return _.template(emailTmpl, model);
			} else {
				return _.template(messageTmpl, model);
			}
		},

		events: {
			'click .delete': 'removeMe',
			'click .messageview .panel-body': 'openMessage',
			'click .messageDetails':'openMessage',
			'click *':'openMessage',
			'open': 'openMessage'
		},

		openMessage: function(e) {
			e.preventDefault();
			vent.trigger('message:openMessage', this.model);
		},

		removeMe: function() {
			var self = this;

			overlay.confirm('You are about to delete this message. Are you sure?', function() {
				if (yes) {
					self.model.destroy();
				}
			});
		}
	});

	
/* Messages List */

	var MessagesView = marionette.CollectionView.extend({
		itemView: MessageView,
		className: 'list-group',
		appendHtml: function(collectionView, itemView) {
			collectionView.$el.prepend(itemView.el);
		}
	});

	return marionette.Layout.extend({
		state: 'list',			// 'list', 'new'
		openMessageId: null,	// if 'list' type, this may be null, or an id

		tagName: 'div',

		className: 'messages',

		attributes: {
			style: 'padding-top:40px'
		},

		regions: {
			container: '.container',
			msgList: '.msgList',
			msgDetail: '.msgDetail',
			msgNew: '.msgNew'
		},

		ui: {
			'btnToggle': '.js-toggle-list',
			'msgList': '.msgList',
			'msgDetail': '.msgDetail'
		},

		events: {
			'click #tabBtnMsgList': 'listMessages',
			'click #tabBtnMsgNew': 'newMessage',
			'click .messages': 'fetchMessages'
		},

		refresh: function() {
			this.collection.fetch({
				data: $.param(this.fetchParams)
			});
		},

		template: function() {
			return _.template(tmpl);
		},


		initialize: function() {
			var self = this;

			if(this.options.params && this.options.params.rcpt) {
				this.state = 'new';
			}
			
			this.fetchParams = {
				type: 'messages'
			};
			
			vent.on('message:openMessage', function(msgModel) {
				self.openMessage(msgModel);
			});

			vent.on('message:replySent', function(msgModel) {
				self.fetchMessages();
			});

			vent.on('message:newMessage', function(msgModel) {
				self.fetchMessages();
				self.fetchMessageThread(msgModel);
			});

			vent.on('notifications:messagesChanged', function(msgModel) {
				self.fetchMessages();
			});

			vent.on("notification:message", function() {
				self.fetchMessages();
			});

			vent.on("overlay:reset", function() {
				document.getElementById("replyBtn").scrollIntoView();
			});
		},

		onRender: function() {
			var self = this;
			
		// Switch the display according to our state...
			if(this.collection.length === 0) {
				this.state = 'new';
			}

			switch(this.state) {
				case 'list':					
					this.msgList.show(new MessagesView({
						collection: this.collection
					}));

				// If there's no selected message and we're on a wide screen, select the first...
					if(!this.openMessageId) {
						if($("#media-width-detection-element").width() > 753) {
							if(this.collection.length) {
								this.openMessageId = this.collection.at(this.collection.length - 1).id;
							}
						}						
					}
					
					if(this.openMessageId) {
						$('.msgList').addClass('on-s-hide-inactive');		// Only show this one on small screens
					} else {
						$('.msgList').removeClass('on-s-hide-inactive');	// None open; show all
					}
					
				// Set one as active...
					this.ui.msgList.find(".list-group-item")
						.removeClass('active');
					
					if(this.openMessageId) {
						this.ui.msgList.find(".list-group-item[data-id='" + this.openMessageId + "']")
							.addClass("active");

						var message = this.collection.get(this.openMessageId);
						this.fetchMessageThread(message);
					}
				break;

				case 'new':
				// if rcpt=user, start composing message to user...
					var rcpt = (this.options.params && this.options.params.rcpt) || null;
					if(rcpt) {
						this.msgNew.show(new NewMessageView({
							recipient: this.options.params.rcpt
						}));
					} else {
						this.msgNew.show(new NewMessageView({
							recipient: ''
						}));
					}
				break;
			}
			
			globals.setBackgroundBlank();
			this.setActiveTab(this.state);

			return this;
		},
		
		
		onShow: function() {
			this.setActiveTab(this.state);
		},
		

		setActiveTab: function(tabId) {
			var sections = {
				'list': { tab: '#tabBtnMsgList', area: '#tabAreaMsgList' },
				'new': { tab: '#tabBtnMsgNew', area: '#tabAreaMsgNew' }
			};
		
			var section = sections[tabId];
				
			var $tabNav = $("#message_container ul.nav");
			var $tabAreas = $("#message_container .tab-content");
			
			$tabNav.find(section.tab).closest('li').addClass('active');
			$tabAreas.find(section.area).addClass('active');
		},

		listMessages: function() {
			this.state = 'list';
			this.openMessageId = null;
			this.render();
		},
		
		openMessage: function(msgModel) {
			this.state = 'list';
			this.openMessageId = msgModel.id;
			this.render();
		},

		newMessage: function() {
			this.state = 'new';
			this.render();
		},
		
		fetchMessages: function() {
			this.fetchParams = {
				type: 'message'
			};
			this.collection.fetch({ reset:true, data: $.param(this.fetchParams)});
		},

		fetchMessageThread: function(message) {
			if(!message) {
				return;
			}

			var messageId = (typeof message === 'string') ? message : message.id;
            
            this.fetchMessages();
            this.msgList.show(new MessagesView({
                collection: this.collection
            }));

			var self = this;
			var messages = new models.Messages();
			messages.fetch({
				data: $.param({
					type: 'messageCollection',
					parentId: messageId,
					sort: 'desc',
					take: 4
				}),
				success: function(data) {
                    $('#tabBtnMsgList').tab('show');
					self.msgDetail.show(new MessageDetailsView({
						collection: messages,
						model:_.last(messages.models),
						parentMsg: message
					}));
				}
			});
		}
	});
});
