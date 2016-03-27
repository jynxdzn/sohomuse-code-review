define(function(require) {

    var models = require('./../models/models'),
        backbone = require('backbone'),
        vent = require('vent'),
        marionette = require('marionette'),
        _ = require('underscore'),
        tmpl = require('text!./ReplyMessageView.html'),
		selectize = require('selectize'),
        overlay = require('./../overlay/overlay');

    return marionette.ItemView.extend({

        tagName: 'div',

        className: 'new_message',

        events: {
            'click .btn-send': 'reply'
        },

        template: function(model) {
            return _.template(tmpl, model);
        },

        onRender: function() {
			this.model2 = new models.Message({
				messageType: 'reply',
				parentId: this.options.parentMsg.id
			});
			if(this.options.parentMsg.attributes.messageType == 'email') {
				this.model2.set({messageType:'replyEmail'});
			}
        },

		reply: function(event){
			var self = this;
			var changes = 0;
			var change = {};
			var targvalue = null;
            this.$el.find('textarea').each(function(index) {
                var $this = $(this);
				if($this.attr('id')) {
					targvalue = $(this).val();
					if(targvalue.trim() !== '') {
						if($this.data('type') == 'multi') { // if multi split into array
							targvalue = targvalue.split(',');
						}
						change[$this.attr('id')] = targvalue;
						self.model2.set(change);
						changes++;
					}
				}
			});

			if(changes === 0) {
				return;
			}

			this.model2.save(null, {
				success: function (model) {
					self.render();
					vent.trigger('message:replySent', model);
					//overlay.alert('Reply sent successfully.');
				},
				error: function () {
					overlay.alert('There was a problem sending your reply, please refresh the page and try again.');
				}
			});
		},

    });
});
