module.exports = function(grunt) {
	grunt.initConfig({
		// Config: http://www.jshint.com/docs/
		jshint: {
			files: ['public/main.js', 'public/js/*']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	
	grunt.registerTask('dev', ['jshint']);
};