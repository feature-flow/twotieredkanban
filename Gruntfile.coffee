module.exports = (grunt) ->
    grunt.initConfig
        pkg: grunt.file.readJSON('package.json')
        watch:
            coffeescript:
                options:
                  sourceMap: true
                files: ['client/*.coffee']
                tasks: ['coffee:compile']
        coffee:
            compile:
                options:
                  sourceMap: true
                expand: true
                cwd: 'client/'
                src: ['*.coffee']
                dest: 'static/'
                ext: '.js'



    grunt.loadNpmTasks('grunt-contrib-coffee')
    grunt.loadNpmTasks('grunt-contrib-watch')
