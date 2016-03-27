define(function(require) {

    var backbone = require('backbone');

    var File = backbone.Model.extend({
        urlRoot: '/api/v1/files',
        idAttribute: '_id',
        defaults: {
            name: '',
            description: '',
            shared_with: [],
            tags: [],
            ownerCredit: '',
            credits: [],
            type: 'local',
            isImage: false,
            isVideo: false,
            isAudio: false,
            isDocument: false,
            isPrivate: false,
            showInGallery: true,
            showInShowcase: false,
            showcaseTitle: '',
            showcaseText: ''
        }
    });

    var Files = backbone.Collection.extend({
        model: File,
        url: '/api/v1/files'
    });

    return {
        File: File,
        Files: Files
    };

});
