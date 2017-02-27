# swaggest-test
Swaggest test is a Swagger API specification based testing protocol. It utilizes Swagger JSON files to build a series of requests and check responses to those requests. Adding additional tests is as easy as adding additional documentation, making it simple to build and deploy unit tests without separating the docs.

Here at [Motel](http://motel.is) we started to use Swagger more to build out and document our APIs. Once we found [swagger-test](https://github.com/earldouglas/swagger-test), we loved it, we just needed to cover a few bases. 

We've created this module to create a more complete set of features that better fit our use cases. Features we include in addition to swagger-test:
- Testing for Nested Objects
- Testing for Arrays
- Data Type Verification
- Return Object Verification

This allows us to test the actual values and data that are being returned, instead of just testing status codes.

## Setup
`npm install swaggest-test`

## Swagger
Setting up tests with a swagger spec has never been easier! Once you have a route and method defined in swagger, simply add an `x-test` section after your parameters & responses, for example:
```yaml
paths:
  /pets:
    get:
      description: Returns all pets from the system that the user has access to
      parameters: <blah>
      responses:
        '200': <blah>
      x-test:
        <blah>
```

The `x-test` section should look something like this:
```yaml
  x-test:
    - description: Return 50 dogs/cats
      request:
        headers:
          content-type: application/json
        parameters:
          tags:
            - dogs
            - cats
          limit: 50
          token: $TOKEN
          breed.primary: lab
          colors:
            - black
            - yellow
      response:
        '200':
          headers:
            content-type: application/json
          schema:
            message: 'SUCCESS'
```

Note that parameters are simply given a value, the type (body, query, path) is grabbed from the API specification, so you don't have to worry about specifying that. At the moment, swaggest-test only has the ability to check the response code of the response, but will very soon be able to build more complete checks for responses. The description is a description that you will be able to access when it comes time to run your test, so it's good to know what's going on.

Using `$ref` in parameters e.g. `- $ref: '#/parameters/test'` is allowed, as well as using `$ref` in the body schema, like `schema: $ref: '#/parameters/test'`.

Also important to note that parameters that have a value starting with '$' are variables. You can pass these to swaggest-test and they will get filled in before the tests are generated.

Objects have a special access, where they aren't setup as nested objects, they are setup in a similar way to Javascript objects, where you can set something in an object with the syntax above "object.key = value".

Arrays are as expected, just simple YAML arrays.

Last thing to discuss is the response. By default, we check types and required values as specified in your specification. Past that, you can define a "schema" which essentially functions as a checker for the JSON response. In our example, the JSON returned would have to have the parameter "message" set to "SUCCESS".

Once your swagger file is setup, export it into .json and you can use it for the tool and the library!

## Tool
Swaggest-test includes a tool called `flat-white` which will run mocha based tests off of your swagger.json file, without the need for any setup. If you install swaggest-test globally via npm with `npm install -g swaggest-test`, you can run `flat-white swagger.json` and it will parse your swagger file and run your tests.

Have variables? Cool! Flat-white reads your environment variables, so you can either define them in your shell or create a file named `.env` that looks something like this
```
TOKEN=himom
```

This will fill in your `$TOKEN` variable with `himom`

## Library
The swaggest-test library generates and runs mocha-based tests for you, using a simple function.

```javascript
var swaggestTest = require('swaggest-test');
swaggestTest.runTests(__dirname + '/swagger.json', {TOKEN: 'himom'});
```

If you put that in a file and run it with mocha, swaggest-test will parse your swagger file, and run the tests. For simplicity's sake, swaggest-test runs all tests asynchronously, so you don't have to worry about overlapping network requests.

## References
This library was originally based off of [swagger-test](https://github.com/earldouglas/swagger-test), but has been changed almost entirely.

Also huge thanks to [@saminakh](https://github.com/saminakh) and her work on the Motel swagger-test branch. She did some great work and inspired me to continue making improvements to this library!
