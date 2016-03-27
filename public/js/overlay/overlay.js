define(function(require) {

    var jquery = require('jquery'),
        backbone = require('backbone'),
        marionette = require('marionette'),
        vent = require('vent'),
        tmpl = require('text!./AlertConfirmView.html');

    var OverlayModel = backbone.Model.extend({
        defaults: {
            type: 'alert',
            message: '',
            dismiss: null,
            ok: null
        }
    });

    var OverlayView = marionette.ItemView.extend({

        className: 'container',

        events: {
            'click .dismiss' : 'dismissMe',
            'click .ok': 'okMe'
        },
        
        template: function(model) {
            return _.template(tmpl, model);
        },

        dismissMe: function() {
            reset();
            if (typeof this.model.attributes.dismiss == 'function') {
                this.model.attributes.dismiss();
            }
        },

        okMe: function() {
            if (typeof this.model.attributes.ok == 'function') {
                this.model.attributes.ok(true);
            }

            reset();
        }
    });

    function reset() {
        vent.trigger('overlay:reset');
    }

    function alert(message, onDismiss) {

        var model = new OverlayModel({
            message: message,
            dismiss: onDismiss
        });

        var view = new OverlayView({ model: model });
        show(view);
    }

    function confirm(message, onConfirm, onDismiss) {

        var model = new OverlayModel({
            type: 'confirm',
            message: message,
            dismiss: onDismiss,
            ok: onConfirm
        });

        var view = new OverlayView({ model: model });
        show(view);
    }

    function show(view) {
        vent.trigger('overlay:show', view);
    }

    return {
        reset: reset,
        alert: alert,
        confirm: confirm,
        show: show
    };

});