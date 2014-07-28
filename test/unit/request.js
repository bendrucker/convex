'use strict';

var angular = require('angular');

describe('ConvexRequest', function () {

  var ConvexRequest, request, convexConfig, $httpBackend, $timeout;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexRequest = $injector.get('ConvexRequest');
    convexConfig = $injector.get('convexConfig');
    $httpBackend = $injector.get('$httpBackend');
    $timeout = $injector.get('$timeout');
    request = new ConvexRequest();
  }));

  describe('Constructor', function () {

    it('stores the configuration', function () {
      var config = {};
      expect(new ConvexRequest(config)).to.have.property('config', config);
    });

    it('creates a deferred', function () {
      expect(request)
        .to.have.deep.property('deferred.promise');
    });

  });

  describe('#url', function () {

    it('can use a specific url', function () {
      expect(request.url.call({
        config: {
          url: 'url'
        }
      }))
      .to.equal('url');
    });

    it('can use a specific base', function () {
      expect(request.url.call({
        config: {
          base: 'base'
        }
      }))
      .to.equal('base/');
    });

    it('falls back to the global base', function () {
      convexConfig.base = 'gbase'
      expect(request.url.call({
        config: {}
      }))
      .to.equal('gbase/');
    });

    it('appends a path', function () {
      expect(request.url.call({
        config: {
          base: 'base',
          path: '/path'
        }
      }))
      .to.equal('base/path');
    });

  });

  describe('#then', function () {

    it('handles success and failure', function () {
      var then = sinon.spy(request.deferred.promise, 'then');
      var success = sinon.spy();
      var failure = sinon.spy();
      expect(request.then(success, failure)).to.respondTo('then');
      expect(then).to.have.been.calledWith(success, failure)
    });

  });

  describe('#catch', function () {

    it('handles failure', function () {
      var pCatch = sinon.spy(request.deferred.promise, 'catch');
      var failure = sinon.spy();
      expect(request.catch(failure)).to.respondTo('then');
      expect(pCatch).to.have.been.calledWith(failure)
    });

  });

});
