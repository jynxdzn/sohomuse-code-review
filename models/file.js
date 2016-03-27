var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    config = require('./../config'),
    _ = require('underscore'),
    fs = require('fs.extra'),
	gm = require('gm').subClass({ imageMagick: true }),
	async = require('async'),
    search = require('mongoose-fts');


var thumbnail_compatible_mimetypes = [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/tiff'
];

var audio_mimetypes = [
// mp3 mimetypes (suggested)...
	'audio/mpeg',
	'audio/mpeg3',
	'audio/x-mpeg-3',
	'video/mpeg',
	'video/x-mpeg'
];

var document_mimetypes = [
	'application/pdf',
	'application/x-pdf',
	'application/acrobat',
	'application/vnd.pdf',
	'text/pdf',
	'text/x-pdf',
];

var File = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    added: { type : Date, default : Date.now },

    type: { type: String, enum: ['local', 'youtube', 'vimeo'], default: 'local' },
    external_id: String,

    name: String,
    description: String,
    tags: [String],
    ownerCredit: String,

    credits: [{
        role: String,
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contact'
        },
    }],


    mimetype: String,

// JTR @COULDDO: I think this would be better replaced with an enumeration, since these options are all mutually exclusive:
// media_type: image | video | audio | null(unknown)
    isImage: Boolean,
    isVideo: Boolean,
    isAudio: Boolean,
    isDocument: { type: Boolean, default: false },

    path: String,
    dir: String,
    file_name: String,
    extension: String,
    size: Number,

	dimensions: {
		height: String,
		width: String
	},

    isPrivate: { type: Boolean, default: false },
    showInGallery: { type: Boolean, default: true },

    isThumbnail: { type: Boolean, default: false },		// i.e. This is used by another piece of media as artwork
	thumbnailId: { type: mongoose.Schema.Types.ObjectId, default: null },		// This specifies that this file has another one as its artwork

    showInShowcase: { type: Boolean, default: false },
    showcaseTitle: String,
    showcaseText: String,

	shared_with: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { strict: true });


File.plugin(search, {
    fields: [
        'name',
        'description',
        'tags'
    ]
});

File.statics.thumbnail_compatible_mimetypes = function() {
	return thumbnail_compatible_mimetypes;
}

File.statics.audio_mimetypes = function() {
	return audio_mimetypes;
}

File.statics.document_mimetypes = function() {
	return document_mimetypes;
}

File.methods.isThumbable = function () {
    return _.contains(thumbnail_compatible_mimetypes, this.mimetype);
}


File.methods.getThumbnailPath = function(width, height, cb) {
	var w = 0, h = 0;

	if (width) {
		if (_.isNumber(width) && width > 0) {
			w = width;
		} else if (_.isString(width)) {
			var tmp = parseInt(width, 0);
			if (_.isNumber(tmp) && tmp > 0) {
				w = tmp;
			}
		}
	}

	if (height) {
		if (_.isNumber(height) && height > 0) {
			h = height;
		} else if (_.isString(height)) {
			var tmp = parseInt(height, 0);
			if (_.isNumber(tmp) && tmp > 0) {
				h = tmp;
			}
		}
	}

    if(!(this.isImage || this.isVideo)) {
        var path = config.rootDir + '/public/img/mimetypes/' + this.mimetype.replace('/', '-') + '.png';
        var unknown_path = config.rootDir + '/public/img/mimetypes/unknown.png';
        fs.exists(path, function(exists) {
            if (exists) {
                cb(null, path);
            } else {
                cb(null, unknown_path);
            }
        });

		return;
	}

	if(!this.isThumbable()) {
		var img_path = config.rootDir + '/public/img/mimetypes/image.png';
		cb(null, img_path);

		return;
	}


	if (w && h) {

	} else if (w) {
		if (w == this.dimensions.width) {
			h = this.dimensions.height;
		} else {
			h = this.dimensions.height * w / this.dimensions.width;
		}
	} else if (h) {
		if (h == this.dimensions.height) {
			w = this.dimensions.width;
		} else {
			w = this.dimensions.width * h / this.dimensions.height;
		}
	} else {
		w = this.dimensions.width;
		h = this.dimensions.height;
	}

	if (w == this.dimensions.width && h == this.dimensions.height) {
		cb(null, config.userfilesDir + this.path);
	} else {

		var new_dir = config.userfilesDir + this.dir + '/thumbs';
		var new_path = new_dir + '/' + w + 'x' + h + '.' + this.extension;

		var self = this;
		fs.exists(new_path, function(exists) {
			if (exists) {
				cb(null, new_path);
			} else {
				fs.mkdirp(new_dir, function (err) {
					if (err) throw err;
					gm(config.userfilesDir + self.path).thumb(w, h, new_path, 100, function(err, stdout, stderr, command) {
						cb(err, new_path);
					});
				});
			}
		});
	}
}

File.methods.deleteThumbnails = function (cb) {
    fs.rmrf(config.userfilesDir + this.dir + '/thumbs', cb);
}


File.methods.generateStandardThumbnails = function(cb) {
    var self = this;

	var sizes = [
		{w: 187, h: 200},
		{w: 225, h: 150},
		{w: 240, h: 180},	//gallery thumbnail
		{w: 400, h: null},
		{w: 800, h: null},	// gallery full view
		{w: 1920, h: 1440}	// gallery full view
	];

	async.eachSeries(sizes, function(size, cb_async) {
		self.getThumbnailPath(size.w, size.h, function(err) {
			if(err) {
				return cb_async(err);
			}

			cb_async(null);
		});
	}, function(err) {
		cb(err);
	});
}


module.exports = mongoose.model('File', File);
