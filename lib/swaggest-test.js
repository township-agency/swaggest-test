'use strict';

var templates = require('uri-templates')
  , assert = require('chai').assert;

var exports = module.exports = {};

function isEmpty(obj) {
  return (Object.keys(obj).length === 0 && obj.constructor === Object);
};

function swag(host, uri, method, methodParams, test, variables, spec) {
  this.host = host;
  this.uri = uri;
  this.method = method;
  this.methodParams = methodParams;
  this.test = test;
  this.variables = variables;
  this.spec = spec;

  //guard
  if (!this.test.request) this.test.request = {};
  this.testParams = test.request.parameters;
}

function getDef(spec, ref) {
  var def = spec;
  ref = ref.substring(2).split('/');
  ref.forEach(function(elem) {
    def = def[elem];
  });
  return def;
}

swag.prototype.expandParameters = function() {
  var params = {};
  var methodParams = this.methodParams;
  var spec = this.spec;

  methodParams.forEach(function (param) {
    //body isn't always named body, simple name replace
    if (param['in'] === 'body' && !param.schema['$ref'])
      return params.body = param;
    //same thing but fill in the definition
    if (param['in'] === 'body') {
      params.body = {};
      return params.body.schema = getDef(spec, param.schema['$ref']);
    }
    //fill a definition
    if (param['$ref']) {
      var def = getDef(spec, param['$ref']);
      return params[def.name] = def;
    }
    //simple param
    return params[param.name] = param;
  });

  this.methodParams = params;
  return;
};

swag.prototype.expandResponse = function(status) {
  var spec = this.spec;
  var response = this.spec.paths[this.uri][this.method]
                 .responses[status.toString()].schema;

  if (!response) return null;
  
  if (response['$ref']) {
    response = getDef(spec, response['$ref']);
  }

  return response;
}

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

  var response = {status: status};
  var testResponse = test.response[status.toString()]
  if (testResponse) {
    if (testResponse.headers) response.headers = testResponse.headers;
    if (testResponse.schema) response.schema = testResponse.schema;
  }

  var specResponse = this.expandResponse(status);
  if (specResponse) response.spec = specResponse;

  return {
    description: test.description || this.method + ' ' + this.uri,
    request: request,
    response: response
  };
};

//exported for testing purposes
exports.parse = function(spec, variables) {
  var totalRoutes = 0
    , routesTested = 0;

  var tests = {};

  var host = spec.host || 'localhost';
  host = spec.basePath ? host + spec.basePath : host;

  var defs = spec.definitions;

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
          var swaggy = new swag(host, uri, method, methodParams, test, variables, spec);
          testSet.push(swaggy.parseTest());
        });
      }
      tests[uri][method] = testSet;
    }
  }

  return tests;
}

function recursiveCheck(actual, expected) {
  if (typeof(expected) !== 'object' ||
      typeof(actual) !== 'object') {
    return assert.equal(actual, expected);
  }

  for (var key in expected) {
    if (!actual[key]) {
      assert.equal(actual[key], expected[key]);
    }
    else {
      recursiveCheck(actual[key], expected[key]);
    }
  }
}

function typeassert(type, val) {
  if (typeof(type) !== 'object' || !type.type) {
    return;
  }
  type = type.type;

  var valType = typeof(val);
  if (valType === 'object' && Array.isArray(val)) {
    valType = 'array';
  }

  switch (type) {
    case 'integer':
      valType = Number.isInteger(val) ? 'int' : 'number';
      assert.equal(valType, 'int');
      break;
    case 'number':
      assert.equal(valType, 'number');
      break;
    case 'string':
      assert.equal(valType, 'string');
      break;
    case 'boolean':
      assert.equal(valType, 'boolean');
      break;
    case 'object':
      assert.equal(valType, 'object');
      break;
    case 'array':
      assert.equal(valType, 'array');
      break;
    default:
      assert.equal('undefined', 'undefined');
      break;
  }
}

function recursiveTypeCheck(actual, expected) {
  if (typeof(expected) !== 'object' ||
      typeof(actual) !== 'object' ||
      typeof(expected.properties) !== 'object') {
    return typeassert(expected, actual);
  }

  for (var key in expected.properties) {
    if (!actual[key]) {
      typeassert(expected.properties[key], actual[key]);
    }
    else {
      recursiveTypeCheck(actual[key], expected.properties[key]);
    }
  }
}

function requireassert(spec, val) {
  if (!spec.required) return assert.equal(true, true);

  spec.required.forEach(function(elem) {
    assert.isDefined(val[elem]);
  });
}

function recursiveRequiredCheck(actual, expected) {
  requireassert(expected, actual);

  if (typeof(actual) === 'object' && typeof(expected) === 'object' &&
      expected.properties) {
    for (var key in expected.properties) {
      if (!actual[key]) {
        recursiveRequiredCheck({}, expected.properties[key]);
      }
      else {
        recursiveRequiredCheck(actual[key], expected.properties[key]);
      }
    }
  }
}

//exported for testing purposes
exports.checkResponse = function (actual, expected) {
  if (expected.status) {
    it('Correct status', function() {
      assert.equal(actual.status, expected.status);
    });
  }

  if (expected.headers) {
    it('Correct headers', function() {
      for (var header in expected.headers) {
        assert.equal(actual.headers[header], expected.headers[header]);
      }
    });
  }

  if (expected.schema) {
    it('Correct response values', function() {
      recursiveCheck(actual.data, expected.schema);
    });
  }

  if (expected.spec) {
    it('Correct response types', function() {
      recursiveTypeCheck(actual.data, expected.spec);
    });

    it('Correct required values', function() {
      recursiveRequiredCheck(actual.data, expected.spec);
    });
  }

}

exports.runTests = function(swaggerFile, variables) {
  swaggerFile = path.normalize(process.argv[3]);

	describe('testing your swagger api using ' + swaggerFile, function () {
    var spec = JSON.parse(fs.readFileSync(swaggerFile));
    var tests = exports.parse(spec, process.env);

    for (var route in tests) {
      for (var method in tests[route]) {
        var describeStr = 'Testing ' + method + ' ' + route;
        describe(describeStr, function () {
          tests[route][method].forEach(function (test) {
            describe(test.description, function() {
              it(test.description, function (done) {
                return preq(test.request)
                .then(function (response) {
                  checkResponse(response, test.response);
                  done();
                }, function (response) {
                  checkResponse(response, test.response);
                  done();
                });
              });
            });
          });
        });
      }
    }
  });
}
