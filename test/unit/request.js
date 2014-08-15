'use strict';

var angular = require('angular');

describe('ConvexRequest', function () {

  var ConvexRequest, request, convexConfig, $httpBackend, $window, $timeout;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexRequest = $injector.get('ConvexRequest');
    convexConfig = $injector.get('convexConfig');
    $httpBackend = $injector.get('$httpBackend');
    $window = $injector.get('$window');
    $timeout = $injector.get('$timeout');
    request = new ConvexRequest({});
  }));

  afterEach(function () {
    request.$$cache.destroy();
  });

  describe('Constructor/Config', function () {

    it('stores the configuration with defaults', function () {
      expect(new ConvexRequest({foo: 'bar'}))
        .to.have.property('config')
        .and.contain({
          method: 'GET',
          foo: 'bar'
        });
    });

    it('can accept a full url', function () {
      expect(new ConvexRequest({url: 'http://api/foo'}))
        .to.have.property('config')
        .and.contain({
          url: 'http://api/foo',
          base: 'http://api',
          path: '/foo'
        });
    });

    it('can accept a base and path', function () {
      expect(new ConvexRequest({
        base: 'http://api',
        path: '/foo'
      }))
      .to.have.property('config')
      .and.contain({
        url: 'http://api/foo',
        base: 'http://api',
        path: '/foo'
      });
    });

    it('can accept a query', function () {
      expect(new ConvexRequest({
        base: 'http://api',
        path: '/foo',
        params: {bar: 'baz'}
      }))
      .to.have.property('config')
      .and.contain({
        url: 'http://api/foo?bar=baz',
        base: 'http://api',
        path: '/foo'
      });
    });

    it('creates a deferred', function () {
      expect(request)
        .to.have.deep.property('deferred.promise');
    });

  });

  describe('#toJSON', function () {

    it('outputs parameters needed for batching', function () {
      expect(request.toJSON()).to.have.keys([
        'method',
        'path',
        'query',
        'payload'
      ]);
      expect(request.toJSON()).to.not.have.keys([
        'url',
        'base'
      ]);
    });

  });

  describe('#send', function () {

    beforeEach(function () {
      request.config.url = 'http://api';
    });

    it('can send a GET', function () {
      $httpBackend.expectGET(request.config.url)
        .respond(200, {foo: 'bar'});
      request.send().then(function (response) {
        expect(response).to.deep.equal({foo: 'bar'});
      });
      $httpBackend.flush();
    });

    it('can cache a GET in memory', function () {
      $httpBackend.expectGET(request.config.url)
        .respond(200, {foo: 'bar'});
      request.config.cache = true;
      request.send().then(function () {
        expect(request.$$cache.get(request.config.url))
          .to.deep.equal({
            foo: 'bar'
          });
      });
      $httpBackend.flush();
    });

    it('can skip a $http call for GET in cache', function () {
      request.config.cache = true;
      request.$$cache.put(request.config.url, {foo: 'bar'});
      request.send().then(function (response) {
        expect(response)
          .to.deep.equal({
            foo: 'bar'
          });
      });
      $timeout.flush();
    });

    it('can cache in localStorage', function () {
      $httpBackend.expectGET(request.config.url)
        .respond(200, {foo: 'bar'});
      request.config.cache = 'persist';
      request.send().then(function () {
        expect($window.localStorage.getItem('convex-' + request.config.url))
          .to.equal('{"foo":"bar"}');
      });
      $httpBackend.flush();
    });

    it('can respond from localStorage', function () {
      $window.localStorage
        .setItem('convex-' + request.config.url, angular.toJson({
          bar: 'baz'
        }));
      request.config.cache = 'persist';
      request.send().then(function (response) {
        expect(response).to.deep.equal({bar: 'baz'});
      });
      $timeout.flush();
    });

    it('can send a POST', function () {
      $httpBackend.expectPOST(request.config.url, {})
        .respond(200, {bar: 'baz'});
      request.config.data = {};
      request.config.method = 'post';
      request.send().then(function (response) {
        expect(response).to.deep.equal({bar: 'baz'});
      });
      $httpBackend.flush();
    });

    it('uses #fulfill to handle a success', function () {
      $httpBackend.expectGET(request.config.url)
        .respond(200);
      sinon.spy(request, 'fulfill');
      request.send().then(function () {
        expect(request.fulfill)
          .to.have.been.calledWith(sinon.match({
            status: 200,
          }));
      });
      $httpBackend.flush();
    });

    it('uses #reject to handle an error', function () {
      $httpBackend.expectGET(request.config.url)
        .respond(404);
      sinon.spy(request, 'reject');
      request.send().then(function () {
        expect(request.reject)
          .to.have.been.calledWith(sinon.match({
            status: 404
          }));
      });
      $httpBackend.flush();
    });
    
  });

  describe('#fulfill', function () {

    it('handles an angular response object', function () {
      expect(request.fulfill({
        status: 200,
        data: {foo: 'bar'},
        headers: function () {}
      }))
      .to.eventually.deep.equal({
        foo: 'bar'
      });
      $timeout.flush();
    });

    it('handles a generic response object', function () {
      expect(request.fulfill({
        foo: 'bar'
      }))
      .to.eventually.deep.equal({
        foo: 'bar'
      });
      $timeout.flush();
    });

    it('handles a boom error object', function () {
      sinon.spy(request, 'reject');
      expect(request.fulfill({
        error: 'Error!',
        statusCode: 404
      }))
      .to.be.rejected
      .then(function (err) {
        expect(request.reject)
          .to.have.been.calledWith(sinon.match({
            status: 404,
            data: {
              statusCode: 404,
              error: 'Error!'
            }
          }));
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.equal('Error!');
      });
      $timeout.flush();
    });

  });

  describe('#reject', function () {

    it('handles generic errors', function () {
      expect(request.reject({
        status: 404,
        data: {
          statusCode: 404,
          error: 'Not Found'
        }
      }))
      .to.be.rejected
      .then(function (err) {
        expect(err.message).to.equal('Not Found');
        expect(err.statusCode).to.equal(404);
        expect(err.data).to.deep.equal({
          statusCode: 404,
          error: 'Not Found'
        });
      });
      $timeout.flush();
    });

    it('handles custom error messages', function () {
      expect(request.reject({
        status: 404,
        data: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Oh dear...'
        }
      }))
      .to.be.rejected
      .then(function (err) {
        expect(err.message).to.equal('Oh dear...');
      });
      $timeout.flush();
    });

    it('handles bad responses', function () {
      expect(request.reject({
        status: 0,
        data: void 0
      }))
      .to.be.rejected
      .then(function (err) {
        expect(err.statusCode).to.equal(0);
        expect(err.data).to.be.empty;
        expect(err.name).to.equal('Invalid Response');
        expect(err.message).to.equal(err.name);
      });
      $timeout.flush();
    });

  });

  describe('#then', function () {

    it('handles success and failure', function () {
      var then = sinon.spy(request.deferred.promise, 'then');
      var success = sinon.spy();
      var failure = sinon.spy();
      expect(request.then(success, failure)).to.respondTo('then');
      expect(then).to.have.been.calledWith(success, failure);
    });

  });

  describe('#catch', function () {

    it('handles failure', function () {
      var pCatch = sinon.spy(request.deferred.promise, 'catch');
      var failure = sinon.spy();
      expect(request.catch(failure)).to.respondTo('then');
      expect(pCatch).to.have.been.calledWith(failure);
    });

  });

});
