'use strict';

var angular = require('angular');

describe('ConvexRequest', function () {

  var ConvexRequest, request, convexConfig, $httpBackend;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexRequest = $injector.get('ConvexRequest');
    convexConfig = $injector.get('convexConfig');
    $httpBackend = $injector.get('$httpBackend');
    request = new ConvexRequest({});
  }));

  describe('Constructor', function () {

    it('stores the configuration with defaults', function () {
      expect(new ConvexRequest({foo: 'bar'}))
        .to.have.property('config')
        .and.contain({
          method: 'GET',
          foo: 'bar'
        });
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

  describe('#send', function () {

    it('defaults to a get request', function () {
      $httpBackend.expectGET(request.url()).respond(200);
      request.send();
      $httpBackend.flush();
    });

    it('can send a post', function () {
      $httpBackend.expectPOST(request.url(), {}).respond(200);
      request.config.data = {};
      request.config.method = 'post';
      request.send();
      $httpBackend.flush();
    });

    it('resolves the data', function () {
      $httpBackend.expectGET(request.url()).respond(200, {
        foo: 'bar'
      });
      request.send().then(function (data) {
        expect(data).to.deep.equal({foo: 'bar'});
      });
      $httpBackend.flush();
    });

    it('handles generic errors', function () {
      $httpBackend.expectGET(request.url()).respond(404, {
        statusCode: 404,
        error: 'Not Found'
      });
      expect(request.send())
        .to.be.rejected
        .then(function (err) {
          expect(err.message).to.equal('Not Found');
          expect(err.statusCode).to.equal(404);
          expect(err.data).to.deep.equal({
            statusCode: 404,
            error: 'Not Found'
          });
        });
      $httpBackend.flush();
    });

    it('handles custom error messages', function () {
      $httpBackend.expectGET(request.url()).respond(404, {
        statusCode: 404,
        error: 'Not Found',
        message: 'Oh dear...'
      });
      expect(request.send())
        .to.be.rejected
        .then(function (err) {
          expect(err.message).to.equal('Oh dear...');
        });
      $httpBackend.flush();
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
