var util = require('util'),
    Validator = require('./../node_modules/node-validation/lib').Validator;

var ContactValidator = function() {
	Validator.call(this);
  this.ruleFor('firstName').isNotEmpty().withMessage('First Name is required');
  this.ruleFor('lastName').isNotEmpty().withMessage('Last Name is required');
  this.ruleFor('emails').is(function(value) {
      for (var i = 0; i < value.length; i++) {
        if (!this.isEmpty(value[i])) {
          return true;
        }
      }
      return false;
    }).withMessage('Email address is required');
};

util.inherits(ContactValidator, Validator);

module.exports = ContactValidator;