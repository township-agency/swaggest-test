'use strict';

var templates = require('uri-templates')
  , assert = require('chai').assert;

var exports = module.exports = {};

function isEmpty(obj) {
  return (Object.keys(obj).length === 0 && obj.constructor === Object);
};

function swag(host, uri, method, methodParams, test, variables) {
  this.host = host;
  this.uri = uri;
  this.method = method;
  this.methodParams = methodParams;
  this.test = test;
  this.variables = variables;

  //guard
  if (!this.test.request) this.test.request = {};
  this.testParams = test.request.parameters;
}

swag.prototype.expandParameters = function() {
  var params = {};

  this.methodParams.forEach(function (param) {
    //body isn't always named body
    if (param['in'] === 'body') params.body = param;
    else params[param.name] = param;
  });

  this.methodParams = params;
  return;
};

function fillTestParam(testParam, variables) {
  if (typeof(testParam) !== 'string') return testParam;
  if (testParam[0] !== '$') return testParam;
  var fillKey = testParam.substring(1);
  if (variables[fillKey]) return variables[fillKey];
  return testParam;
};

swag.prototype.fillTestParams = function() {
  var ret = {};
  for (var key in this.testParams) {
    ret[key] = fillTestParam(this.testParams[key], this.variables);
  }

  this.testParams = ret;
  return;
};

swag.prototype.parseParameters = function() {
  if(!this.testParams || !this.methodParams) {
    return {path: null, query: null, body: null};
  }
  var ret = {
    path: {},
    query: {},
    body: {},
    header: {},
    invalid: {}
  };
  this.expandParameters();
  this.fillTestParams();

  var testParams = this.testParams;
  var methodParams = this.methodParams;

  for (var key in testParams) {
    if (methodParams[key]) {
      var location = methodParams[key]['in'];
      switch (location) {
        case 'path':
          ret.path[key] = testParams[key];
          break;
        case 'query':
          ret.query[key] = testParams[key];
          break;
        case 'header':
          ret.header[key] = testParams[key];
          break;
        default:
          ret.invalid[key] = testParams[key];
          break;
      }
    }
    else if (methodParams.body && methodParams.body.schema &&
             methodParams.body.schema.type === 'object' &&
             methodParams.body.schema.properties &&
             methodParams.body.schema.properties[key]) {
      ret.body[key] = testParams[key];
    }
    else ret.invalid[key] = testParams[key];
  }

  if (isEmpty(ret.body)) ret.body = null;
  if (isEmpty(ret.query)) ret.query = null;
  if (isEmpty(ret.header)) ret.header = null;

  return ret;
};

swag.prototype.parseTest = function() {
  var test = this.test
  var parameters = this.parseParameters();
  var template = templates(this.uri)
    , fullUri = template.fill(parameters.path);

  if (test.response && Object.keys(test.response).length === 1) {
    var status = parseInt(Object.keys(test.response)[0]) || 200;
  }
  else var status = 200;

  var request = {};
  request.path = parameters.path;
  request.query = parameters.query;
  request.body = parameters.body
  request.headers = test.request.headers;

  //parameter headers override static headers
  //if there's a conflict
  if (parameters.header) {
    if (!request.headers) request.headers = {};
    for (var header in parameters.header) {
      request.headers[header] = parameters.header[header];
    }
  }

  //preq's body parser requires a content-type
  if (request.body) {
    if (!request.headers) request.headers = {};
    if (!request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
    }
  }

  request.method = this.method;
  request.uri = 'http://' + this.host + fullUri;

  return {
    description: test.description || this.method + ' ' + this.uri,
    request: request,
    response: {
      status: status
    }
  };
};

exports.parse = function(spec, variables) {
  var totalRoutes = 0
    , routesTested = 0;

  var tests = {};

  var host = spec.host || 'localhost';

  var paths = spec.paths || {};
  for (var uri in paths) {
    var path = spec.paths[uri];
    tests[uri] = {};
    for (var method in path) {
      var testSet = [];
      totalRoutes++;
      var pathTests = path[method]['x-test'];
      var methodParams = path[method].parameters;
      if (pathTests) {
        routesTested++;
        pathTests.forEach(function (test) {
          var swaggy = new swag(host, uri, method, methodParams, test, variables);
          testSet.push(swaggy.parseTest());
        });
      }
      tests[uri][method] = testSet;
    }
  }

  return tests;
}

exports.assert = function(expected, actual) {
  if (expected.status) {
    assert.equal(expected.status, actual.status);
  }

  if (expected.headers) {
    assert.equal(expected.headers, actual.headers);
  }
}
