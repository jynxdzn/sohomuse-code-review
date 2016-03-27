define(function(require) {

    var models = require('./../models/models'),
        jquery = require('jquery'),
        backbone = require('backbone'),
        vent = require('vent'),
        navigate = require('navigate'),
        marionette = require('marionette'),
        _ = require('underscore'),
        tmpl = require('text!./NewMessageView.html'),
		selectize = require('selectize'),
        overlay = require('./../overlay/overlay');

    return marionette.ItemView.extend({
        tagName: 'div',

        className: 'new_message',

        events: {
            'click .btn-send': 'send'
        },

        template: function() {
            return _.template(tmpl);
        },

        initSelectize: function(user) {

            var self = this;

			this.model = new models.Message({ messageType: 'message' });

            $.get('/api/v1/contacts?type=connections').success(function(data) {
                var options = _.map(data, function (contact) {
                    var obj = (contact.user ? contact.user : contact);
                    return {
                        id: contact.userId,
                        name: obj.firstName + ' ' + obj.lastName
                    };
                });

                self.$el.find('#recipients').selectize({
                    delimiter: ',',
                    valueField: 'id',
                    labelField: 'name',
                    searchField: ['name'],
                    options: options
                });
            });
        },

		initialize: function(options) {
			this.options = options;
			_.bindAll(this, 'render');
		},
		
        onRender: function() {
        	var self = this;

        	if (this.options && this.options.recipient) {
        		// Get user.
        		$.get("/api/v1/users/username/" + this.options.recipient).success(function(user) {
        			self.$el.find("#recipients").val(user._id);
        			self.initSelectize(user);
        		});
        	} else {
				this.initSelectize();
        	}
        },

		send: function(event){
			var self = this;
			var change = {};
			var targvalue = null;
			this.$el.find('input, textarea').each(function(index) {
                var $this = jquery(this);
				if($this.attr('id')) {
					targvalue = $this.val();
					if($this.data('type') == 'multi') { // if multi split into array
						targvalue = targvalue.split(',');
					}
					change[$this.attr('id')] = targvalue;
				}
			});

			this.model.set(change);

			this.model.save(null, {
				success: function (model) {
					//self.render();
					vent.trigger('message:newMessage', model);
                    self.$el.find('input, textarea').val('');
                    self.$el.find('.selectized')[0].selectize.clear();
                    backbone.history.loadUrl(backbone.history.fragment);
					overlay.alert('Message sent successfully.');
				},
				error: function () {
					overlay.alert('There was a problem sending your message, please refresh the page and try again.');
				}
			});
		},

    });
});