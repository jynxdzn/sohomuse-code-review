var mongoose = require('mongoose'),
    middleware = require('./../code/middleware'),
	Async = require('async'),
    _ = require('underscore'),
    config = require('./../config'),
    utils = require('./../code/utils'),
    sys = require('sys'),
    path = require('path'),
    File = mongoose.model('File'),
    User = mongoose.model('User'),
    fs = require('fs.extra'),
    gm = require('gm').subClass({ imageMagick: true }),
    rest = require('restler'),
    mmm = require('mmmagic'),
    NewsItem = require('./../models/newsitem'),
    Magic = mmm.Magic;

module.exports = function(app, passport) {

    app.get('/api/v1/files/resetpublic', middleware.authenticateApi, function (req, res) {

		Async.parallel([
			function(cb) {
				File.update({}, { isPrivate: false, showInGallery: true }, { multi: true }, function (err) {
					cb(err);
				});
			},
			function(cb) {
				File.update({ type: 'local', image: true }, { isImage: true, isVideo: false }, { multi: true }, function (err) {
					cb(err);
				});
			},
			function(cb) {
				File.update({ type: { $ne: 'local' } }, { isVideo: true, isImage: false }, { multi: true }, function (err) {
					cb(err);
				});
			},
			function(cb) {
				File.update({ isImage: { $ne: true }, isVideo: { $ne: true } }, { isVideo: false, isImage: false }, { multi: true }, function (err) {
					cb(err);
				});
			}
		], function(err, result) {
			if(err) {
				return res.send({ status: 'error' });
			}

			res.send({ status: 'ok' });
		});
    });


    app.get('/api/v1/showcase/:username', function(req, res) {
        var username = req.param('username');

        User.findByUsername(username, function(err, user) {
            if (err || ! user) {
                return res.send({ status: 'error' });
            }
            File
            .find({
                owner: user._id,
                showInShowcase: true
            })
            .sort({ added: -1 })
            .select('_id dimensions type external_id name showcaseTitle showcaseText')
            .exec(function(err, files) {
                if (err) return res.render('500');
                res.send(files);
            });
        });
    });

    app.get('/api/v1/gallery/:username', function(req, res) {
        var username = req.param('username');

        User.findByUsername(username, function(err, user) {

            var queryOptions = {
                owner: user._id,
                isPrivate: false,
                isThumbnail: { $ne: true },
                showInGallery: { $ne: false }
            };

            var type = req.param('type');
            switch (type) {
                case 'images':
                    queryOptions.type = 'local';
                    queryOptions.isImage = true;
                    queryOptions.mimetype = { $in: File.thumbnail_compatible_mimetypes() };
                break;
                case 'videos':
                    queryOptions.type = { $in: ['youtube', 'vimeo'] };
                    queryOptions.isVideo = true;
                    queryOptions.mimetype = { $in: File.thumbnail_compatible_mimetypes() };
                break;
                case 'audio':
                    queryOptions.type = 'local';
                    queryOptions.isAudio = true;
                break;
                case 'document':
                    queryOptions.type = 'local';
                    queryOptions.isDocument = true;
                break;
            }

            File
            .find(queryOptions)
            .sort({ added: -1 })
            .select('_id dimensions type external_id name isImage isVideo isAudio isDocument description tags credits')
            .populate('credits.contact', '_id target_user target_username firstName lastName')
            .exec(function(err, files) {
              if (err) return res.render('500');
              res.send(files);
            });
        });
    });

    app.get('/api/v1/files', middleware.authenticateApi, function(req, res) {

        var query = req.param('q') ? File.search(req.param('q')) : File.find();

        query = query.where('isThumbnail').ne(true);	// Don't show thumbnails in the gallery

        if (req.param('type') == 'shared_files') {
            query = query.where('shared_with').equals(req.user._id);
        } else if (req.param('type') == 'gallery') {
            query = query.where('owner').equals(req.user._id).where('showInGallery').equals(true);
        } else {
            query = query.where('owner').equals(req.user._id);
        }

        if (req.param('image')) {
            query = query.or([ { isImage: true }, { image: true } ]);     // CR: looks like "image" was replaced with isImage.
        }

        if (req.param('video')) {
            query = query.or([ { isVideo: true }, { video: true } ]);
        }

        if (req.param('audio')) {
            query = query.or({ isAudio: true });
        }

        if (req.param('document')) {
            query = query.or({ isDocument: true });
        }

        var skip = req.param('skip');
        if (skip) {
            query = query.skip(skip);
        }

        var take = req.param('take');
        if (take) {
            query = query.limit(take);
        }

        query.populate('owner').exec(function(err, files) {
          if (err) return res.render('500')
          res.send(files);
        });
    });


    function moveFile(type, a, b, cb) {
        if (type == 'youtube') {
            var gm_img = gm(a);

            gm_img.size(function (err, data) {
                var h = (data.width / 16) * 9;
                var offset = (data.height - h) / 2;
                gm_img.crop(data.width, h, 0, offset).write(b, cb);
            });
        } else {
		// NB: in Vagrant, some filesystem problem happens between Win host <-> *nix guest. move() works, rename() fails.
			if(config.isVagrantOnPc) {
				fs.move(a, b, cb);
			} else {
				fs.rename(a, b, cb);
			}
        }
    }


// options: {
//	isThumbnail: true	<- uses this as a thumbnail for another item (i.e. don't show in galleries)
// }
// cb(err, file)
// <- file is the result to pass out to the client as JSON
    function processFile(req, res, fileInfo, options, cb) {
        var tmp_path = fileInfo.path;
        var file = new File(_.extend(options || {}, {
            owner:req.user._id,
            added: new Date()
        }));

        var video = (options && options.type && (options.type == 'youtube' || options.type == 'vimeo'));

        file.dir = '/' + req.user.username + '/' + file._id;
		    file.isThumbnail = (options && options.isThumbnail);
        file.file_name = (video ? options.external_id : fileInfo.name);
        file.description = fileInfo.description || '';
        file.name = (video ? fileInfo.name : file.file_name);
        file.path = file.dir + '/' + file.file_name;
        var i = file.file_name.lastIndexOf('.');
        file.extension = (i < 0) ? '' : file.file_name.substr(i + 1);

        var target_dir = config.userfilesDir + file.dir;
        var target_path = config.userfilesDir + file.path;

        fs.stat(tmp_path, function(err, stats) {
            if (err) {
				return cb(err);
			}

            file.size = stats.size;

            var magic = new Magic(mmm.MAGIC_MIME_TYPE);
            magic.detectFile(tmp_path, function(err, mimetype) {
				if (err) {
					return cb(err);
				}

                file.mimetype = mimetype;

                file.image = file.type == 'local' && _.contains(File.thumbnail_compatible_mimetypes(), mimetype);
                file.isImage = file.type == 'local' && _.contains(File.thumbnail_compatible_mimetypes(), mimetype);

                file.isVideo = file.type != 'local';

                file.isAudio = file.type == 'local' && _.contains(File.audio_mimetypes(), mimetype);
                file.isDocument = file.type == 'local' && _.contains(File.document_mimetypes(), mimetype);

                showInGallery = file.isImage || file.isVideo;

                fs.mkdirp(target_dir, function (err) {
					if (err) {
						return cb(err);
					}

					console.log(file);
					
                    moveFile(file.type, tmp_path, target_path, function(err) {
						if (err) {
							return cb(err);
						}

                        fs.exists(tmp_path, function(exists) {
                            if (exists) {
                                fs.unlink(tmp_path, function(err) {
									if (err) {
										return cb(err);
									}
                                });
                            }
                        });

                        if (file.isImage || file.isVideo) {
                            gm(target_path)
                            .size(function (err, data) {
								if (err) {
									return cb(err);
								}

                                file.dimensions = data;

                                file.save(function(err, file) {
									if(err) {
										return cb(err);
									}

                                    file.generateStandardThumbnails(function(err) {
                                        if(err) {
											return cb(err);
										}

										cb(null, file);
                                    });
                                });

                            });
                        } else {
                            file.save(function(err, file) {
								if (err) {
									return cb(err);
								}

                                cb(null, file);
                            });
                        }
                    });
                });
            });
        });
    }


    app.post('/api/v1/files/add', middleware.authenticateApi, function(req, res) {
        var url = req.param('url'),
            postNews = (req.param('postNews') == 1);

        var type, external_id, thumb_url;

        if(video = url.match(/(youtube|youtu|vimeo)\.(com|be)\/(watch\?v=([\-\w]+)|([\-\w]+))/)) {
            if(video[1] == 'youtube') {
                type = 'youtube';
                external_id = video[4];
            } else if(video[1] == 'youtu') {
                type = 'youtube';
                external_id = video[3];
            } else if(video[1] == 'vimeo') {
                type = 'vimeo';
                external_id = video[3];
            }
        }

        if (type && external_id) {

            var dir = config.userfilesDir + '/' + req.user.username;
            var path = dir + '/temp';
            fs.mkdirp(dir, function (err) {
                if (err) throw err;

                if (type == 'youtube') {
                    rest.get('http://gdata.youtube.com/feeds/api/videos/' + external_id + '?v=2&alt=json')
                        .on('complete', function(data, response) {
                            thumb_url = 'http://img.youtube.com/vi/' + external_id + '/0.jpg';
                            utils.downloadFile(thumb_url, path, function() {
                                var info = {
                                    path: path,
                                    name: (data && data.entry ? data.entry.title.$t : external_id),
                                    description: (data && data.entry ? data.entry.media$group.media$description.$t : null)
                                };

                                processFile(req, res, info, {
                                    type: type,
                                    external_id: external_id
                                }, function(err, file) {
									if(err) {
										return res.json(500, err);
									}

                                    res.json(file);

                                    if (postNews) {
                                        NewsItem.Add(NewsItem.ACTION__ADD_VIDEO, req.user._id, {
                                            file_id: file._id
                                        }, function(err, item) {    // Ignore response for now
                                        });
                                    }

								});
                            });
                    });
                } else if (type == 'vimeo') {
                    rest.get('http://vimeo.com/api/v2/video/' + external_id + '.xml')
                        .on('complete', function(data, response) {
                        	var vid = (data && data.videos && data.videos.video && data.videos.video.length > 0 ? data.videos.video[0] : null);
                        	if (vid === null) {
                        		return res.send({ 'error': 'Could not load video', 'data': data });
                        	}
                            //var vid = data.videos.video[0];
                            thumb_url = vid.thumbnail_large[0];
                            utils.downloadFile(thumb_url, path, function() {
                                var info = {
                                    path: path,
                                    name: vid.title[0],
                                    description: vid.description[0].replace(/[ \t]*<br \/>[ \t]*/g, '\n')
                                };
                                processFile(req, res, info, {
                                    type: type,
                                    external_id: external_id
                                }, function(err, file) {
									if(err) {
										return res.json(500, err);
									}

                                    res.json(file);

                                    if (postNews) {
                                        NewsItem.Add(NewsItem.ACTION__ADD_VIDEO, req.user._id, {
                                            file_id: file._id
                                        }, function(err, item) {    // Ignore response for now
                                        });
                                    }

								});
                            });
                    });
                }
            });
        } else {
             res.send({'error':'URL not supported'});
        }
    });
  
  app.post('/api/v1/files/redactor/upload', middleware.authenticateApi, function(req, res) {
    processFile(req, res, req.files.file, {}, function(err, file) {
      if(err) {
        return res.render('500');
      }
      res.json({
        filelink: '/api/v1/files/' + file._id + '/thumb'
      });
    });
  });


	app.post('/api/v1/files/upload', middleware.authenticateApi, function(req, res) {
		processFile(req, res, req.files.uploadFile, {}, function(err, file) {
			if(err) {
				return res.render('500', err);
			}

      var postNews = (req.body.postNews == 1);

        if (postNews) {
    			if(file.isImage) {
    				NewsItem.Add(NewsItem.ACTION__ADD_PICTURES, req.user._id, {
    					file_id: file._id
    				}, function(err, item) {	// Ignore response for now
    				});
    			} else if(file.isVideo) {
    				NewsItem.Add(NewsItem.ACTION__ADD_VIDEO, req.user._id, {
    					file_id: file._id
    				}, function(err, item) {	// Ignore response for now
    				});
    			} else if(file.isAudio) {
    				NewsItem.Add(NewsItem.ACTION__ADD_AUDIO, req.user._id, {
    					file_id: file._id
    				}, function(err, item) {	// Ignore response for now
    				});
    			} else if(file.isDocument) {
    				NewsItem.Add(NewsItem.ACTION__ADD_DOCUMENT, req.user._id, {
    					file_id: file._id
    				}, function(err, item) {	// Ignore response for now
    				});
    			}
            }

			res.json(file);
		});
	});


    app.get('/api/v1/files/:id', middleware.authenticateApi, function(req, res) {
        File
        .findOne({
            _id: req.param('id')
        })
        .exec(function(err, file) {
            if (err) return res.render('500');
            res.send(file);
        });

    });



// Attach as a thumbnail for another File...
	app.post('/api/v1/files/:id/upload-thumbnail', middleware.authenticateApi, function(req, res) {
		File.findById(req.param('id'), function(err, fileForThumb) {
			if(err) {
					return res.json(500, {'error':'An error has occurred'});
			}

			if(fileForThumb.owner.toHexString() != req.user._id) {
				return res.json(500, {'error':'An error has occurred'});
			}

			if(!fileForThumb.isAudio) {
				return res.json(500, {'error':'An error has occurred'});
			}

			processFile(req, res, req.files.uploadFile, {isThumbnail: true}, function(err, thumbFile) {
				if(err) {
					return res.json(500, {'error':'An error has occurred'});
				}

				fileForThumb.thumbnailId = thumbFile.id;
				fileForThumb.save(function(err) {
					if (err) {
						res.json(500, {'error':'An error has occurred'});
					} else {
						res.send(200, {'success':'File updated'});
					}
				});
			});
		});
	});


	function downloadFile(req, res) {
        File
        .findOne({
            _id: req.param('id')
        })
        .exec(function(err, file) {
            if (err) return res.render('500');
            res.sendfile(config.userfilesDir + file.path);
        });
    }


    function thumbFile(id, width, height, res) {
		File.findById(id, function(err, file) {
			if (err) return res.render('500');
			if (!file) return res.render('404');

			if(file.thumbnailId) {	// This file has another file as a thumbnail...
				// NB @TODO: Could recurse!
				thumbFile(file.thumbnailId,  width, height, res);
			} else {
				file.getThumbnailPath(width, height, function(err, path) {
					res.sendfile(path);
				});
			}
		});
    }


    app.get('/api/v1/files/:id/download', downloadFile);
    app.get('/files/:id/download', downloadFile);


    app.get('/api/v1/files/:id/thumb', function(req, res) {
		thumbFile(req.param('id'), req.param('width'), req.param('height'), res);
	});

    app.get('/files/:id/thumb', function(req, res) {
		thumbFile(req.param('id'), req.param('width'), req.param('height'), res);
	});


    app.put('/api/v1/files/:id', middleware.authenticateApi, function(req, res) {
        File
        .findOne({
            _id: req.param('id'),
            owner: req.user._id
        })
        .exec(function(err, file) {
            if (err) return res.render('500');

            file.name = req.param('name');
            file.description = req.param('description');
            file.ownerCredit = req.param('ownerCredit');
            file.shared_with = req.param('shared_with');
            file.tags = req.param('tags');
            file.isPrivate = req.param('isPrivate');
            file.showInGallery = (file.isImage || file.isVideo || file.isAudio || file.isDocument) && req.param('showInGallery');
            file.showInShowcase = req.param('showInShowcase');
            file.showcaseTitle = req.param('showcaseTitle');
            file.showcaseText = req.param('showcaseText');
            file.credits = req.param('credits');
            file.save(function(err) {
                if (err) {
                    res.send({'error':'An error has occurred'});
                } else {
                    res.send({'success':'File updated'});
                }
            });
        });
    });

    app.delete('/api/v1/files/:id', middleware.authenticateApi, function(req,res) { //deletefile
        File
        .findOne({
            _id: req.param('id'),
            owner: req.user._id
        })
        .exec(function(err, file) {
            if (err) return res.render('500');

            fs.rmrf(file.dir, function (err) {
                file.remove(function(err, file) {
                    if (err) return res.render('500')
                    res.send({'success':'File deleted'});
                });
            });
        });
    });

    app.post('/api/v1/files/:id/aviary-edit', middleware.authenticateApi, function(req, res) {

      var url = req.param('url');

      File
      .findOne({
          _id: req.param('id'),
          isImage: true,
          owner: req.user._id
      })
      .exec(function(err, file) {

        if (err || !file) return res.render('500');

        data = file.toObject();
        delete data._id;
        newFile = new File(data);
        newFile.dir = '/' + req.user.username + '/' + newFile._id;
        newFile.path = newFile.dir + '/' + newFile.file_name;

        fs.mkdirp(config.userfilesDir + newFile.dir, function (err) {
          utils.downloadFile(url, config.userfilesDir + newFile.path, function() {
            newFile.save(function (err) {
                if (err) {
                    res.send({'error':'An error has occurred'});
                } else {
                  newFile.deleteThumbnails(function(err) {
                    res.send({
                      'success': 'File updated',
                      'id': newFile._id.toString()
                    });
                  });
                }
            });
          });
        });

      });
    });
}
