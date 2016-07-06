'use strict';

var templates = require('uri-templates')
  , assert = require('chai').assert;

var exports = module.exports = {};

function isEmpty(obj) {
  return (Object.keys(obj).length === 0 && obj.constructor === Object);
};

function expandParameters(methodParams) {
  var params = {};

  methodParams.forEach(function (param) {
    //body isn't always named body
    if (param['in'] === 'body') params.body = param;
    else params[param.name] = param;
  });

  return params;
};

function parseParameters(testParams, methodParams) {
  if(!testParams || !methodParams) return {path: null, query: null, body: null};
  var ret = {
    path: {},
    query: {},
    body: {},
    header: {},
    invalid: {}
  };
  methodParams = expandParameters(methodParams);

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

function parseTest(host, uri, method, methodParams, test) {
  //guard
  if (!test.request) test.request = {};
  var parameters = parseParameters(test.request.parameters, methodParams);
  var template = templates(uri)
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

  request.method = method;
  request.uri = 'http://' + host + fullUri;

  return {
    description: test.description || method + ' ' + uri,
    request: request,
    response: {
      status: status
    }
  };
};

exports.parse = function(spec) {
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
          testSet.push(parseTest(host, uri, method, methodParams, test));
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
