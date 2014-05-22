module.exports = function () {
  this.baseURL = 'https://api.valet.io',
  this.$get = require('./model');
};