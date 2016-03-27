define(function(require) {
    var marionette = require('marionette'),
        _ = require('underscore'),
        backbone = require('backbone'),
        vent = require('vent'),
        redactor = require('redactor'),
        jquery = require('jquery'),
        navigate = require('navigate'),
        tmpl = require('text!./EditProfileView.html'),
        countries = require('data/countries.js'),
        occupations = require('data/occupations.js'),
        accents = require('data/accents.js'),
        langs = require('data/langs.js'),
        socialNetworks = require('data/social.js'),
        performance_skills = require('./../../data/performance_skills'),
        athletic_skills = require('./../../data/athletic_skills'),
        selectize = require('selectize'),
        overlay = require('./../overlay/overlay'),
        bootstrap_tab = require('bootstrap.tab'),
        styles = require('css!./style'),
        models = require('./../models/models'),
        BusinessCardView = require('./../business_card/BusinessCardView'),
        FileSelectorView = require('./../file_selector/FileSelectorView'),
		RepresentationListView = require('./RepresentationListView'),
		RepresentationFormView = require('./RepresentationFormView');

    return marionette.Layout.extend({
        tagName: 'div',

		className: 'editprofile',
		showList: true,
		showForm: false,

		regions: {
			container: ".container",
			bcard: ".bcard-container",
			representationListRegion: '#representationList',
			representationFormRegion: '#representationForm',
			representationAddButton: '#representationAddButton'
		},

        events: {
			'change': 'applyChange',
            'click #btn-representation-add-form': 'openRepresentationFormAdd',
            'click .btn-representation-edit-form': 'openRepresentationFormEdit',
            'click .btn-representation-delete': 'deleteRepresentation',
            'click .save': 'saveMe',
            'click .exit': 'closeMe',
            'click .choose-image': 'chooseImage'
        },

        ui: {
            firstName: '#firstName',
            lastName: '#lastName',
            bio: '[name="bio"]',
            phone: '#phone',
            emails: '#emails',
            age: '#age',
            country: '#country',
			occupation: '#occupation',
            occupations: '#occupations',
            awards: '#awards',
            accents: '#accents',
            langs: '#langs',
            performance_skills: '#performanceSkills',
            athletic_skills: '#athleticSkills',
            keywords: '#keywords',
            height: '#height',
            weight: '#weight',
            hair: '#hair',
            hair_length: '#hairLength',
            eyes: '#eyes',
			representationList: '#representationList',
			representationForm: '#representationForm',
            btnAdd: '#btn-representation-add-form'
        },

		initialize: function() {
			vent.bind('rep-form-close', this.closeRepresentationForm, this);
			vent.bind('rep-upsert', this.upsertRepresentation, this);
		},

        template: function(model) {

			countries = _.map(countries, function(data, key){
				data.text = data.text.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
				return data;
			});

            return _.template(tmpl, _.extend(model, {
            	countries: countries,
            	networks: socialNetworks
            }));
        },

        onRender: function() {
            var self = this;

            this.bcard.show(new BusinessCardView({ model: this.model }));

            self.ui.emails.selectize({
                plugins: ['drag_drop'],
                delimiter: ',',
                persist: false,
                valueField: 'text',
                labelField: 'text',
                create: function(input) {
                    return {
                        value: input,
                        text: input
                    };
                }
            });
          
            $('head').append($('<link>').attr({
              type: 'text/css',
              rel: 'stylesheet',
              href: '/bower_components/redactor/redactor.css'
            }));
          
            self.ui.bio.redactor({
              minHeight: 300,
              imageUpload: '/api/v1/files/redactor/upload'
            });

            self.ui.keywords.selectize({
                plugins: ['drag_drop'],
                delimiter: ',',
                persist: false,
                valueField: 'text',
                labelField: 'text',
                create: function(input) {
                    return {
                        value: input,
                        text: input
                    };
                }
            });

            var opts = [].concat(occupations.options, _.map(this.model.get("skills").occupations, function(x) { return { text: x, value: x }; }));

            self.ui.occupations.selectize({
                valueField: 'value',
                labelField: 'value',
                searchField: ['value'],
                options: opts,  //occupations.options,
                optgroups: occupations.optgroups,
                optgroupField: 'class',
                create: function(input) {
                    return {
                        value: input,
                        text: input
                    };
                }
            });

			self.ui.accents.selectize({
				valueField: 'text',
				labelField: 'text',
				searchField: ['text'],
				options: _.map(accents, function(x) { return { text: x }; })
			});

			self.ui.langs.selectize({
				valueField: 'text',
				labelField: 'text',
				searchField: ['text'],
				options: _.map(langs, function(x) { return { text: x }; })
			});

			self.ui.performance_skills.selectize({
				valueField: 'text',
				labelField: 'text',
				searchField: ['text'],
				options: _.map(performance_skills, function(x) { return { text: x }; })
			});

			self.ui.athletic_skills.selectize({
				valueField: 'text',
				labelField: 'text',
				searchField: ['text'],
				options: _.map(athletic_skills, function(x) { return { text: x }; })
			});

			self.renderRepresentationTab();
		},


		renderRepresentationTab: function() {
			if(this.showList) {
				this.renderRepresentationList();
				this.ui.representationList.show();
				this.ui.btnAdd.show();
			} else {
				this.ui.representationList.hide();
				this.ui.btnAdd.hide();
			}

			if(this.showForm) {
				this.ui.representationForm.show();
			} else {
				this.ui.representationForm.hide();
			}
		},


		renderRepresentationList: function() {
			this.representationListRegion.show(new RepresentationListView({collection: this.model.get('representation')}));
		},


        chooseImage: function() {
            var self = this;
            FileSelectorView.show({
                only_images: true,
                select: function(fileModel) {
                    self.updateImage(fileModel);
                    overlay.reset();
                }
            });
        },

		openRepresentationFormAdd: function() {
			this.representationFormRegion.show(new RepresentationFormView(this.model, new models.Representation(), 'add'));

			this.showForm = true;
			this.showList = false;
			this.renderRepresentationTab();
		},

		openRepresentationFormEdit: function(e) {
			var id = $(e.target).attr('data-representer-id');

			this.representationFormRegion.show(new RepresentationFormView(this.model, this.model.get('representation').get(id), 'edit'));

			this.showForm = true;
			this.showList = false;
			this.renderRepresentationTab();
		},

		closeRepresentationForm: function() {
			this.showForm = false;
			this.showList = true;
			this.renderRepresentationTab();
		},


		upsertRepresentation: function(representation) {
			var updateRep = this.model.get('representation').get(representation.id);
			if(typeof updateRep == 'undefined') {	// Add
				this.model.get('representation').add(representation);
			}
		},


		deleteRepresentation: function(e) {
			var id = $(e.target).attr('data-representer-id');

			this.model.get('representation').remove(this.model.get('representation').get(id));
			this.renderRepresentationList();
		},


        updateImage: function(fileModel){
            var self = this;
            var change = {};
            var changeNested = this.model.attributes.bcard;
            var newimg = '/api/v1/files/' + fileModel.attributes._id + '/thumb?width=187&height=220';

            changeNested.img = newimg;
            change.bcard = changeNested;
            this.model.set(change);

            this.$el.find('.bcard_img div').css('background-image', 'url(' + newimg + ')');
        },

		applyChange: function(event){
            var target = event.target;
			var $target = $(target);

			if($target.closest('#representation').length) {	// Ignore data from the representation forms
				return;
			}

			var change = {};
			var targvalue = target.value;
            if($target.attr('type') == 'checkbox') {
                targvalue = $target.is(':checked');
            } else if($target.data('type') == 'multi') { // if multi split into array
				targvalue = target.value.split(',');
			}

			if(target.name.indexOf('.') === -1) { // this is to catch nested values
				change[target.name] = targvalue;
			} else {
				var targname = target.name.split('.');
				var changeNested = this.model.attributes[targname[0]];
				changeNested[targname[1]] = targvalue;
				change[targname[0]] = changeNested;
			}

			this.model.set(change);
            this.bcard.currentView.render();
		},

        saveMe: function() {
            var self = this;

          this.model.set('bio', self.ui.bio.val());
          
			this.model.save(null, {
				success: function(model) {
					// Saving destroys a models submodels, as per this Backbone bug ticket...
					// https://github.com/jeromegn/Backbone.localStorage/issues/131
					// So we're reloading rather than self.render();
					// TODO: But - this seems to corrupt the screen regions
					//	Representation Tab -> Save -> Representation Tab -> Edit -> Cancel ???
					//Backbone.history.loadUrl();
					navigate('edit');

					overlay.alert('Your profile has been saved.');

				},
				error: function () {
					overlay.alert('There was a problem saving your profile, please refresh the page and try again.');
				}
			});

        },

        closeMe: function() {
            window.location.hash = '#';
            navigate('/');
        }

    });
});
