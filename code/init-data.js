var mongoose = require('mongoose'),
	Contact = mongoose.model('Contact'),
	User = mongoose.model('User'),
	Async = require('async'),
	NewsItem = require('./../models/newsitem'),
    Project = require('./../models/project');


function createConnection(user1, user2, cb) {
    var contact1 = new Contact({
        owner: user1._id,
        added: new Date(),
        firstName: user2.firstName,
        lastName: user2.lastName,
        emails: [user2.emails[0]],
        connection_date: new Date(),
        connection_isPrivate: false
    });

    contact1.setTargetUser(user2);

    user1.counts.connections++;

    var contact2 = new Contact({
        owner: user2._id,
        added: new Date(),
        firstName: user1.firstName,
        lastName: user1.lastName,
        emails: [user1.emails[0]],
        connection_date: new Date(),
        connection_isPrivate: false
    });

    contact2.setTargetUser(user1);

    user2.counts.connections++;

	Async.series([
		function(cb_step) {
			contact1.save(function(err) {
				console.log(err ?
					'Could not create contact: ' + user1.username + ' > ' + user2.username
					: 'Created contact: ' + user1.username + ' > ' + user2.username);

				cb_step(err);
			});
		}, function(cb_step) {
			contact2.save(function(err) {
				console.log(err ?
					'Could not create contact: ' + user2.username + ' > ' + user1.username
					: 'Created contact: ' + user2.username + ' > ' + user1.username);

				cb_step(err);
			});
		}, function(cb_step) {
            user1.save(function(err) {
				cb_step(err);
			});
		}, function(cb_step) {
			user2.save(function(err) {
				cb_step(err);
			});
		}
	], function(err) {
		cb(err);
	});
}


User.findByUsername('simon', function(err, user) {
    if(err) {
		throw err;
	}

    if (!user) {	// Seed the user and connection collections...
        var simon = new User({
            username: 'simon',
            firstName: 'Simon',
            lastName: 'Bartlett',
            emails: ['simon@sohomuse.com'],
        });

        var michael = new User({
            username: 'michael',
            firstName: 'Michael',
            lastName: 'Griffiths',
            emails: ['michael@sohomuse.com'],
        });

        var consuelo = new User({
            username: 'consuelo',
            firstName: 'Consuelo',
            lastName: 'Costin',
            emails: ['consuelo@sohomuse.com'],
        });

        var umi = new User({
            username: 'umi',
            firstName: 'Umi',
            lastName: 'McGuckin',
            emails: ['umi@sohomuse.com'],
        });

		var zoran = new User({
			username: 'zoran',
			firstName: 'Zoran',
			lastName: 'Jevtic',
			emails: ['zoran@sohomuse.com'],
		});

		var kemel = new User({ 
			username: 'kemel', 
			firstName: 'Kemel', 
			lastName: 'McKenzie', 
			emails: ['kemelmckenzie@gmail.com'],
		});

        var password = 'pass';

		Async.series([
			function(cb_step) {
			seedUsers([simon, michael, consuelo, umi, zoran, kemel], password, function(err) {
					cb_step(err);
				});
			}, function(cb_step) {
				seedConnections([[consuelo, umi], [simon, umi], [simon, michael], [umi, zoran], [consuelo, zoran]], function(err) {
					cb_step(err);
				});
			}
		], function(err) {
			if (err) {
				throw err;
			}
		});
	}
});


function seedUsers(users, password, cb) {
	Async.each(users, function(user, item_cb) {
		User.register(user, password, function(err) {
			if(err) {
				console.log("Could not create user: " + user.username);
				return item_cb(err);
			}

			console.log('Created user: ' + user.username);
			return item_cb();
		});
	}, function(err) {
		cb(err);	// ...Propagate up if there are any errors
	});
}


// Connection pairs is an array of [user1, user2] items
function seedConnections(connectionPairs, cb) {
	Async.each(connectionPairs, function(connectionPair, item_cb) {
		var user1 = connectionPair.shift();
		var user2 = connectionPair.shift();
		createConnection(user1, user2, function(err) {
			if(err) {
				console.log("Could not connect users: " + user1.username + ' and ' + user2.username);
				return item_cb(err);
			}

			console.log("Connected users: " + user1.username + ' and ' + user2.username);
			return item_cb();
		});
	}, function(err) {
		cb(err);	// ...Propagate up if there are any errors
	});
}


Contact.update({creator:{$exists:false}},{ approved: Date.now() },{ multi:true }, function(err){
	if (err) {
		console.log("failed to mark initial contacts as approved");
	} else {
		console.log("updated all initial contacts as approved");
	}
});


// Shim to update existing data...
NewsItem.Migrate(function(err, migrateCount) {
	if(err) {
		console.log("*** ERROR - could not migrate all stored NewsItems to latest format");
	}

	console.log("NewsItems: Migrated " + migrateCount + " items");
});


// Shim to update existing data...
/*Project.Migrate(function(err, migrateCount) {
    if(err) {
        console.log("*** ERROR - could not migrate all projects to latest format");
    }

    console.log("Projects: Migrated " + migrateCount + " items");
});
*/
