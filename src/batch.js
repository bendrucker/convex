'use strict';

module.exports = function (ConvexRequest, $q, convexConfig) {

  function ConvexBatch () {
    this.requests = [];
  }

  ConvexBatch.prototype.parallel = true;

  ConvexBatch.prototype.add = function (request) {
    this.requests.push(request);
  };

  ConvexBatch.prototype.toJSON = function () {
    return {
      requests: this.requests,
      parallel: this.parallel
    };
  };

  ConvexBatch.prototype.process = function () {
    var batch = this;
    return new ConvexRequest({
      method: 'post',
      path: convexConfig.batch,
      data: this
    })
    .send()
    .catch(function (err) {
      batch.requests.forEach(function (request) {
        request.reject(err);
      });
      return $q.reject(err);
    })
    .then(function (responses) {
      responses.forEach(function (response, index) {
        batch.requests[index].fulfill(response);
      });
      return $q.all(batch.requests);
    });    
  };

  return ConvexBatch;

};

module.exports.$inject = [
  'ConvexRequest',
  '$q',
  'convexConfig'
];
