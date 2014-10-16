'use strict';

var angular = require('angular');

describe('ConvexBatch', function () {

  var ConvexBatch, ConvexRequest, batch, $q, $timeout;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(angular.mock.module(function ($provide) {
    $provide.decorator('ConvexRequest', function ($delegate) {
      return sinon.spy($delegate);
    });
  }));
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexBatch = $injector.get('ConvexBatch');
    ConvexRequest = $injector.get('ConvexRequest');
    $q = $injector.get('$q');
    $timeout = $injector.get('$timeout');
    batch = new ConvexBatch();
  }));

  describe('Constructor', function () {

    it('creates a request array', function () {
      expect(batch.requests).to.be.empty;
    });

  });

  describe('#add', function () {

    it('adds requests', function () {
      batch.add({});
      expect(batch.requests).to.have.length(1);
    });

  });

  describe('#toJSON', function () {

    it('outputs the requests and parallel setting', function () {
      expect(batch.toJSON()).to.deep.equal({
        requests: [],
        parallel: true
      });
    });

  });

  describe('#process', function () {

    var request, responses;
    beforeEach(function () {
      request = new ConvexRequest();
      batch.add(request);
      responses = [];
      sinon.stub(ConvexRequest.prototype, 'send')
        .returns($q.when(responses));
    });

    it('sends a request', function () {
      batch.process();
      $timeout.flush();
      expect(ConvexRequest).to.have.been.calledWithMatch({
        method: 'post',
        path: '/batch',
        data: batch.toJSON()
      });
      expect(ConvexRequest.firstCall.returnValue.send)
        .to.have.been.called;
    });

    it('fulfills the requests', function () {
      var response = {
        foo: 'bar'
      };
      responses.push(response);
      sinon.stub(request, 'fulfill');
      batch.process();
      $timeout.flush();
      expect(request.fulfill)
        .to.have.been.calledWith(response);
    });

    it('propogates errors to requests', function () {
      var err = new Error();
      sinon.stub(request, 'reject');
      ConvexRequest.prototype.send
        .returns($q.reject(err));
      expect(batch.process()).to.be.rejected;
      $timeout.flush();
      expect(request.reject).to.have.been.calledWith(err);
    });

    it('resolves if all the requests resolve', function () {
      responses.push('foo');
      expect(batch.process()).to.eventually.deep.equal(['foo']);
      $timeout.flush();
    });

  });

});
