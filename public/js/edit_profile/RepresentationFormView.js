define(function(require) {
    var backbone = require('backbone'),
        marionette = require('marionette'),
        _ = require('underscore'),
        vent = require('vent'),
        jquery = require('jquery'),
        models = require('./../models/models'),
		countries = require('data/countries.js'),
        formHtml = require('text!./RepresentationFormView.html');

    return marionette.ItemView.extend({
        tagName: 'div',
        className: '',

		ui: {
			type: '#rep_type',
			name: '#rep_name',
			email: '#rep_email',
			phone1: '#rep_phone1',
			phone2: '#rep_phone2',
			address1: '#rep_address1',
			address2: '#rep_address2',
			address3: '#rep_address3',
			city: '#rep_city',
			state: '#rep_state',
			zip: '#rep_zip',
			country: '#rep_country',
			submit: '#rep_submit',
			cancel: '#rep_cancel'
		},

		events: {
			'click @ui.cancel': 'cancel',
			'click @ui.submit': 'submit'
		},

		initialize: function(parentModel, model, type) {
			this.parentModel = parentModel;
			this.model = model;
			this.type = type;
		},

		template: function(model) {
			var countriesOptions = _.map(countries,function(data, key){
				data.text = data.text.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
				return data;
			});

			return _.template(formHtml, _.extend(model.toJSON(), {countries: countriesOptions}));
		},

		render: function() {
			this.$el.html(this.template(this.model));
		},

		setType: function(e){
			this.model.set({type: $(this.ui.type).val()});
		},

		setName: function(e){
			this.model.set({name: $(this.ui.name).val()});
		},

		setEmail: function(e){
			this.model.set({email: $(this.ui.email).val()});
		},

		setPhone1: function(e){
			this.model.set({phone1: $(this.ui.phone1).val()});
		},

		setPhone2: function(e){
			this.model.set({phone2: $(this.ui.phone2).val()});
		},

		setAddress1: function(e){
			this.model.set({address1: $(this.ui.address1).val()});
		},

		setAddress2: function(e){
			this.model.set({address2: $(this.ui.address2).val()});
		},

		setAddress3: function(e){
			this.model.set({address3: $(this.ui.address3).val()});
		},

		setCity: function(e){
			this.model.set({city: $(this.ui.city).val()});
		},

		setState: function(e){
			this.model.set({state: $(this.ui.state).val()});
		},

		setZip: function(e){
			this.model.set({zip: $(this.ui.zip).val()});
		},

		setCountry: function(e){
			this.model.set({country: $(this.ui.country).val()});
		},

		submit: function() {
		// Ensure the model is updated with our data..
			this.setType();
			this.setName();
			this.setEmail();
			this.setPhone1();
			this.setPhone2();
			this.setAddress1();
			this.setAddress2();
			this.setAddress3();
			this.setCity();
			this.setState();
			this.setZip();
			this.setCountry();

			vent.trigger('rep-upsert', this.model);
			vent.trigger('rep-form-close');
		},

		cancel: function() {
			vent.trigger('rep-form-close');
		}
    });

});