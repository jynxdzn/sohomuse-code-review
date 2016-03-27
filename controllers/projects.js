var _ = require('underscore'),
    middleware = require('./../code/middleware'),
    mongoose = require('mongoose'),
    Project = mongoose.model('Project'),
    User = mongoose.model('User'),
    utils = require('./../code/utils'),
    config = require('./../config'),
    NewsItem = require('./../models/newsitem')
    logger = require('./../code/logger');

module.exports = function(app, passport, agenda) {


    /**
     * Get a users projects
     */
    app.get('/api/v1/projects', function (req, res) {

        var query = req.param('q') ? Project.search(req.param('q')) : Project.find(),
            username = req.param('username'),
            queryOptions = {},
            status = req.param('status');

        if (username) {

            // Get all projects for specified :username (list their projects on profile)

            User.findByUsername(username, function(err, user) {

                queryOptions = {
                    owner: user._id,
                };

                if (status == 'active') {
                    queryOptions.isLive = 1;
                } else if (status == 'complete') {
                    queryOptions.isComplete = 1;
                }

                Project
                .find(queryOptions)
                .sort({ added: 1 })
                .select('_id title added isLive isComplete background files collaborators owner requiredRoles userRoles')
                //.populate('photos videos')
                //.populate('collaborators', 'target_username firstName lastName city country career')
                .populate('collaborators', 'target_user target_username firstName lastName city country career')
                .populate('owner', 'username firstName lastName city country career')
                .populate('files.file')
                .exec(function(err, projects) {
                    if (err) return res.render('500');
                    res.send(projects);
                });
            });

        } else {

            // Get logged in users own projects for showing in Edit list
            queryOptions = {
                owner: req.user._id
            };

            Project
            .find(queryOptions)
            .sort({ added: 1 })
            .select('_id title added isLive isComplete background files collaborators owner requiredRoles userRoles')
            //.populate('photos videos')
            .populate('collaborators', 'target_user target_username firstName lastName city country career')
            .populate('owner', 'username firstName lastName city country career')
            .populate('files.file')
			.exec(function(err, projects) {
				if (err) return res.render('500');
				res.send(projects);
			});
        }
    });


    /**
     * Create new project
     */
    app.post('/api/v1/projects', middleware.authenticateApi, function (req, res) {

        var options = _.extend({}, req.body);
        delete options.added;
        options.owner = req.user._id;

        var project = new Project(options);

        project.save(function(err) {
            res.send(project);
			NewsItem.Add(NewsItem.ACTION__ADD_PROJECT, req.user._id, {
				project_id: project._id,
                title: project.title,
                summary: project.summary,
                requiredRoles: project.requiredRoles
			}, function(err, item) {	// Ignore response for now
			});
        });
    });


    /**
     * Get one project
     */
    app.get('/api/v1/projects/:id', function (req, res) {
        Project
        .findOne({ _id: req.param('id') })
        .populate('owner')
        .populate('endorsements.user')
        // .populate('photos')
        // .populate('videos')
        .populate('files.file')
        //.populate('collaborators', 'username firstName lastName city country career')
        .populate('collaborators', 'target_username firstName lastName')
        .populate({ path: 'collaborators'})
        .exec(function (err, project) {
            var options = {
                path: 'collaborators.target_user',
                model: 'User',
                select: 'username firstName lastName city country career'
            };
            Project.populate(project, options, function(err, p) {
                res.send(p);
            });
            //res.send(project);
        });
    });


    /**
     * Thumbnail of a project
     *
     */
    app.get('/api/v1/projects/:id/thumbnail', function(req, res) {

        var width = req.param('width'),
            height = req.param('height');

        Project
        .findOne({ _id: req.param('id') })
        .populate('files.file')
        .exec(function (err, project) {

            if (project.files && project.files.length > 0) {

                // Get first image from the files
                var x = _.find(project.files, function(file) {
                    if (file.fileType === "image") {
                        return true;
                    }
                });

                if (x !== undefined) {
                    // var src = '/files/' + x.file._id + '/thumb';
                    x.file.getThumbnailPath(width, height, function(err, path) {
                        return res.sendfile(path);
                    });
                } else {
                    res.redirect('/img/logo-square.png');
                }

            } else {
                res.redirect('/img/logo-square.png');
            }

        });

    });


	app.put('/api/v1/projects/:id', middleware.authenticateApi, function (req, res) {
		Project.findOne({ owner: req.user._id, _id: req.param('id') }, function (err, project) {
			delete req.body.owner;
			delete req.body.photos;
			delete req.body.videos;
			delete req.body.files;
			project.set(req.body);
			project.owner = req.user._id;
			project.save(function (err) {
				if (err) {
					console.log(err);
					res.send({'error':'An error has occurred', 'reason': err });
				} else {

					// send emails to users telling them they have been added to a project
					// 1) Get collaborators
					// 2) Get collaborators already notified
					// 3) Send email to those from 1) who are not in 2)
					//
					project.notifyCollaborators(req, req.user, function(err) {
						// Just set it going - don't wait for it to finish
					});

					if (err) {
						return res.send({ 'success': 'Project updated but could not notify collaborators', reason: err });
					}
					
					NewsItem.Add(NewsItem.ACTION__UPDATE_PROJECT, req.user._id, {
						project_id: project._id,
						title: project.title,
					}, function(err, item) {	// Ignore response for now
					});
				
					res.send({ 'success': 'Project updated' });
				}
			});
		});
	});


    app.delete('/api/v1/projects/:id', middleware.authenticateApi, function (req, res) {

    	Project
        .findOne({ owner: req.user._id, _id: req.param('id') })
        .exec(function(err, project) {
            if (err) return res.render('500');

            project.remove(function(err, project) {
                if (err) return res.render('500')
                res.send({ 'success':'Project deleted' });
            });
        });
    });


    /**
     * Add/remove files from project
     */
    app.post('/api/v1/projects/media', middleware.authenticateApi, function (req, res) {

        var project = req.body.project || null,
            file = req.body.file || null,
            type = req.body.type || "other",
            action = req.body.action || "add";

        Project.findOne({ _id: project, owner: req.user._id }, function (err, project) {

            if (action == "add") {

                project.files.push({
                    fileType: type,
                    file: file
                });

            } else if (action == "remove") {

                project.files = _.filter(project.files, function(item) {
                    return item._id != file;
                });

            }

            project.save(function(err) {
                return res.send({ "project": project });
            });

        });

    });

}
