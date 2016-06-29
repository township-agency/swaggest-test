'use strict';

var templates = require('uri-templates');

var exports = module.exports = {};

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
  var ret = {
    path: {},
    query: {},
    body: {},
    invalid: {}
  };
  if(!testParams || !methodParams) return ret;
  var methodParams = expandParameters(methodParams);

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

  if (!Object.keys(ret.body).length) ret.body = null;
  if (!Object.keys(ret.query).length) ret.query = null;

  return ret;
};

function parseTest(host, uri, method, methodParams, test) {
  //guard
  if (!test.request) test.request = {};
  var parameters = parseParameters(test.request.parameters, methodParams);
  var template = templates(uri)
    , fullUri = template.fill(parameters.path);

  var status = parseInt(test.response.status) || 200;

  var request = {};
  request.path = parameters.path;
  request.query = parameters.query;
  request.body = parameters.body

  request.method = method;
  request.uri = 'http://' + host + fullUri;

  return {
    description: test.description || method + ' ' + uri,
    request: request,
    response: status
  };
};

exports.parse = function(spec) {
  var totalRoutes = 0
    , routesTested = 0;

  var tests = [];

  var host = spec.host || 'localhost';

  var paths = spec.paths || {};
  for (var uri in paths) {
    var path = spec.paths[uri];
    for (var method in path) {
      totalRoutes++;
      var pathTests = path[method]['x-test'];
      var methodParams = path[method].parameters;
      if (pathTests) {
        pathTests.forEach(function (test) {
          tests.push(parseTest(host, uri, method, methodParams, test));
        });
      }
    }
  }

  console.log('Total routes:', totalRoutes);
  console.log('Routes tested:', routesTested);
  return tests;
}
