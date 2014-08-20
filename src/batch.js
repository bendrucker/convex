'use strict';

module.exports = function (ConvexRequest, $q, convexConfig) {

  var ConvexBatch = function () {
    this.requests = [];
  };

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
    .then(function (responses) {
      responses.forEach(function (response, index) {
        batch.requests[index].fulfill(response);
      });
    })
    .catch(function (err) {
      batch.requests.forEach(function (request) {
        request.reject(err);
      });
      return $q.reject(err);
    });
  };

  return ConvexBatch;

};

module.exports.$inject = [
  'ConvexRequest',
  '$q',
  'convexConfig'
];
