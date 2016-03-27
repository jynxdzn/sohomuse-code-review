;(function(document) {

    var themes = ['artist', 'cinema', 'fashion'],
        idx = Math.floor(Math.random() * themes.length);

    document.addEventListener('DOMContentLoaded', function() {
        var body = document.getElementsByTagName('body')[0],
            className = 'theme-' + themes[idx];

        if (body.classList) {
            body.classList.add(className);
        } else {
            body.className += ' ' + className;
        }
    });

})(document);
