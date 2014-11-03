'use strict';

var gulp    = require('gulp');
var plugins = require('gulp-load-plugins')();
var extend  = require('xtend');
var argv    = require('yargs').argv;

gulp.task('lint', function () {
  gulp.src(['./src/**/*.js', './test/**/*.js', './gulpfile.js'])
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'));
});

var testConfig = {
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
    transform: ['browserify-shim']
  },
  coverageReporter: {
    type: 'html',
    dir: './coverage',
    subdir: './'
  },
  reporters: ['progress', 'coverage'],
  browsers: ['PhantomJS'],
  singleRun: !!process.env.CI
};

gulp.task('test', function () {
  return require('karma-as-promised').server.start(extend({}, testConfig, {
    browserify: {
      debug: true,
      transform: ['browserify-istanbul', 'browserify-shim']
    },
    coverageReporter: {
      type: 'html',
      dir: './coverage',
      subdir: './'
    }
  }));
});

var launchers = require('./sauce.json');
gulp.task('sauce', function () {
  return require('karma-as-promised').server.start(extend({}, testConfig, {
    sauceLabs: {
      testName: 'Convex Unit Tests',
      startConnect: false,
      recordScreenshots: false,
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER
    },
    transports: ['xhr-polling'],
    captureTimeout: 0,
    browserNoActivityTimeout: 120000,
    reporters: ['dots', 'saucelabs'],
    browsers: Object.keys(launchers),
    customLaunchers: launchers
  }));
});

gulp.task('bump', function () {
  gulp.src(['./package.json', './bower.json'])
    .pipe(plugins.bump({
      type: argv.type
    }))
    .pipe(gulp.dest('./'));
});
