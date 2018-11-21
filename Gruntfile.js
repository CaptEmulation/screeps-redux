module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        screeps: {
            options: {
                host: '127.0.0.1',
                http: true,
                branch: 'default',
                ptr: false
            },
            dist: {
                files: [
                    {
                        cwd: './',
                        src: ['main.js'],
                    }
                ]
            }
        }
    });
}
