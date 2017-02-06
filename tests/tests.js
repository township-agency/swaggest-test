'use strict';

var fs = require('fs');
var swaggestTest = require('../lib/swaggest-test');
var assert = require('chai').assert;

describe('Swaggest-test tests', function() {
  describe('test generation', function () {
    var testDir = __dirname;
    var buffer  = fs.readFileSync(testDir + '/swagger.json');
    var spec    = JSON.parse(buffer);

    var tests = swaggestTest.parse(spec, {token: 'himom'});

    it('has 3 routes', function () {
      assert.equal(Object.keys(tests).length, 3);
    });

    it('test GET w/ query params on dogs/cats', function () {
       assert.deepEqual(tests['/pets'].get[0], {
         description: 'Return 50 dogs/cats',
         request: {
           path: {},
           query: {
             tags: [
               'dogs',
               'cats'
             ],
             limit: 50
           },
           headers: undefined,
           body: null,
           method: 'get',
           uri: 'http://petstore.swagger.io/api/pets'
         },
         response: {
           status: 200,
           headers: {
             'content-type': 'application/json'
           },
           spec: {
             items: {
               '$ref': '#/definitions/pet'
             },
             type: 'array'
           }
         }
       });
    });

    it('test GET w/ no params', function() {
      assert.deepEqual(tests['/pets'].get[1], {
        description: 'Return E V E R Y T H I N G',
        request: {
          path: null,
          query: null,
          body: null,
          headers: undefined,
          method: 'get',
          uri: 'http://petstore.swagger.io/api/pets'
        },
        response: {
          status: 200,
          headers: {
            'content-type': 'application/json'
          },
          spec: {
            items: {
              '$ref': '#/definitions/pet'
            },
            type: 'array'
          }
        }
      });
    });

    it('test POST', function() {
      assert.deepEqual(tests['/pets'].post[0], {
        description: 'Add a new pet',
        request: {
          path: {},
          query: null,
          body: {
            name: 'garythesnail',
            breed: {
              primary: 'lab',
              secondary: 'poodle'
            },
            colors: ['pink', 'red', 'blue']
          },
          headers: {
            'content-type': 'application/json'
          },
          method: 'post',
          uri: 'http://petstore.swagger.io/api/pets'
        },
        response: {
          status: 200,
          headers: {
            'content-type': 'application/json'
          },
          schema: {
            message: 'SUCCESS'
          },
          spec: {
            properties: {
              id: {
                format: 'int64',
                type: 'integer'
              },
              name: {
                type: 'string'
              },
              tag: {
                type: 'string'
              }
            },
            required: ['id', 'name'],
            type: 'object'
          }
        }
      });
    });

    it('test another GET with a uri param', function() {
      assert.deepEqual(tests['/pets/{id}'].get[0], {
        description: 'Return a pet',
        request: {
          path: {
            id: 101
          },
          headers: undefined,
          query: null,
          body: null,
          method: 'get',
          uri: 'http://petstore.swagger.io/api/pets/101'
        },
        response: {
          status: 200,
          spec: {
            properties: {
              id: {
                format: 'int64',
                type: 'integer'
              },
              name: {
                type: 'string'
              },
              tag: {
                type: 'string'
              }
            },
            required: ['id', 'name'],
            type: 'object'
          }
        }
      });
    });

    it('test DELETE', function() {
      assert.deepEqual(tests['/pets/{id}']['delete'][0], {
        description: 'Delete a pet',
        request: {
          path: {
            id: 101
          },
          headers: undefined,
          query: null,
          body: null,
          method: 'delete',
          uri: 'http://petstore.swagger.io/api/pets/101'
        },
        response: {
          status: 204
        }
      });
    });

    it('test with headers', function() {
      assert.deepEqual(tests['/pets/feed']['get'][0], {
        description: "Feed a pet",
        request: {
          path: {},
          query: null,
          body: null,
          headers: {
            id: 101,
            token: 'himom',
            'content-type': 'application/json'
          },
          method: "get",
          uri: "http://petstore.swagger.io/api/pets/feed"
        },
        response: {
          status: 200
        }
      });
    });
  });

  describe('assertion functionality', function() {

    var expected = {
      status: 200,
      headers: {
        'content-type': 'application/json'
      },
      schema: {
        'message': 'SUCCESS'
      },
      spec: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string'
          }
        }
      }
    };

    var actual = {
      status: 200,
      headers: {
        'content-type': 'application/json'
      },
      body: {
        message: 'SUCCESS'
      }
    }

    it('test full response', function() {
      swaggestTest.checkResponse(actual, expected);
    });

    it('test status', function() {
      swaggestTest.checkResponse({status: 200}, {status: 200});
    });

    var headerReq = {
      headers: {
        'content-type': 'application/json'
      }
    };

    it('test header only', function() {
      swaggestTest.checkResponse(headerReq, headerReq);
    });

    var response = {
      headers: {
        'content-type': 'application/json',
        'things': 'stuff'
      }
    };

    it('test response header with extra params', function() {
      swaggestTest.checkResponse(response, headerReq);
    });

    var schemaReq = {
      schema: {
        'message': 'SUCCESS'
      },
      spec: {
        properties: {
          message: {
            type: 'string'
          }
        }
      }
    };

    response.body = {
      'message': 'SUCCESS'
    };

    it('test schema only', function() {
      swaggestTest.checkResponse(response, schemaReq);
    });

    response.body.cheese = 'doodles';
    schemaReq.spec.properties.cheese = {type: 'string'}

    it('test schema with extra params', function() {
      swaggestTest.checkResponse(response, schemaReq);
    });

    schemaReq.schema.stuff = {
      stuffinstuff: true
    };
    schemaReq.spec.properties.stuff = {type: 'object', properties: {}};
    schemaReq.spec.properties.stuff.properties.stuffinstuff = {type: 'boolean'};
    response.body.stuff = {
      stuffinstuff: true
    };

    it('test nested schema', function() {
      swaggestTest.checkResponse(response, schemaReq);
    });

    schemaReq.schema.stuff.inception = {
      leo: {
        is: {
          inside: {
            my: {
              dreams: true
            }
          }
        }
      }
    };
    schemaReq.spec.properties.stuff.properties.inception = {
      type: 'object',
      properties: {
        leo: {
          type: 'object',
          properties: {
            is: {
              type: 'object',
              properties: {
                inside: {
                  type: 'object',
                  properties: {
                    my: {
                      type: 'object',
                      required: ['dreams'],
                      properties: {
                        dreams: {
                          type: 'boolean'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    response.body.stuff.inception = {
      leo: {
        is: {
          inside: {
            my: {
              dreams: true
            }
          }
        }
      }
    };

    it('test a deeply nested schema', function() {
      swaggestTest.checkResponse(response, schemaReq);
    });

    var typeReq = {
      schema: {
        a: 10,
        b: 10.1,
        c: 'blah',
        d: true,
        e: {
          things: 'stuff'
        },
        f: ['stuff', 'things']
      },
      spec: {
        type: 'object',
        required: ['a', 'b', 'c', 'd', 'e', 'f'],
        properties: {
          a: {type: 'integer'},
          b: {type: 'number'},
          c: {type: 'string'},
          d: {type: 'boolean'},
          e: {type: 'object'},
          f: {type: 'array'}
        }
      }
    };

    var typeResp = {
      body: {
        a: 10,
        b: 10.1,
        c: 'blah',
        d: true,
        e: {
          things: 'stuff'
        },
        f: ['stuff', 'things']
      },
    };

    it('test all types', function() {
      swaggestTest.checkResponse(typeReq, typeResp);
    });
  });
});
