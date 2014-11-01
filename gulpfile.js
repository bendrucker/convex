'use strict';

var gulp    = require('gulp');
var plugins = require('gulp-load-plugins')();
var argv    = require('yargs').argv;

gulp.task('lint', function () {
  gulp.src(['./src/**/*.js', './test/**/*.js', './gulpfile.js'])
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('test', function () {
  return require('karma-as-promised').server.start({
    frameworks: ['browserify', 'mocha', 'chai-sinon'],
    files: [
      'node_modules/es5-shim/es5-shim.js',
      'node_modules/chai-as-promised/lib/chai-as-promised.js',
      'components/angular/angular.js',
      'components/angular-mocks/angular-mocks.js',
      'test/**/*.js'
    ],
    preprocessors: {
      'test/**/*.js': 'browserify'
    },
    browserify: {
      debug: true,
      transform: ['browserify-istanbul', 'browserify-shim']
    },
    coverageReporter: {
      type: 'html',
      dir: './coverage',
      subdir: './'
    },
    reporters: ['progress', 'coverage'],
    browsers: ['PhantomJS'],
    singleRun: !!process.env.CI
  });
});

gulp.task('bump', function () {
  gulp.src(['./package.json', './bower.json'])
    .pipe(plugins.bump({
      type: argv.type
    }))
    .pipe(gulp.dest('./'));
});
