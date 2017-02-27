# swaggest-test
Swaggest test is a Swagger API specification based testing protocol. It utilizes Swagger JSON files to build a series of requests and check responses to those requests. Adding additional tests is as easy as adding additional documentation, making it simple to build and deploy unit tests without separating the docs.

Here at [Motel](http://motel.is) we started to use Swagger more to build out and document our APIs. Once we found [swagger-test](https://github.com/earldouglas/swagger-test), we loved it, we just needed to cover a few bases. 

We've created this module to create a more complete set of features that better fit our use cases. Features we include in addition to swagger-test:
- [Nested Object Input](#objects)
- [Array Input](#arrays)
- [Data Type Verification](#type-checking)
- [Return Object Verification](#responses)

This allows us to test the actual values and data that are being returned, instead of just testing status codes.

## Usage
### Setup
`npm install swaggest-test`

### Constructing Tests
The tests are set up within the swagger.yaml file. Unfortunately, as of right now, `swaggest-test` only supports swagger.json files. You can use the swagger editor to convert from yaml to json, or just transfer this data to json.

The tests are within your endpoint definitions after a special identifier `x-test`. See the following example for clarification:
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

Once you setup this section, you can fill it in with a list of values, very similar to how the the endpoint definition is setup. Take the following as an example:

```yaml
  x-test:
    - description: Basic status test
      request: null
      response:
        '200': null
```

This is a test in its most basic form. This test will make a simple GET request to `/pets` and expect a '200' response from it.

Now that we have a simple test built, we need to run it!

### Running Tests
The recommended way to run tests is with the `swaggest-test` library. This library contains an automated test runner that will perform all of your tests. The following is the most basic execution:

```javascript
var swaggestTest = require('swaggest-test');
swaggestTest.runTests(__dirname + '/swagger.json');
```

Note that this library is written for `mocha`, not `node`, so you will need to save this file and run it with mocha. Mocha can be installed if needed with the following command:

`npm install -g mocha`

Once that's done, you can run your tests!

### Parameters
Parameters have a simple `key: value` format in the Swagger yaml.

```yaml
x-test:
  request:
    parameters:
      color: 'yellow'
```
Parameters are setup to auto-detect where they belong. What this means is that if you have a parameter named `color` in your query, you don't need to tell `swaggest-test` where to put `color`. You simply define `color` and fill it.

#### Arrays
Arrays simply follow YAML syntax.

```yaml
x-test:
  request:
    parameters:
      colors:
        - 'yellow'
        - 'black'
```

#### Objects
Objects in parameters have a simple extended-key representation.
```yaml
x-test:
  request:
    parameters:
      dogs.color: 'yellow'
```

This example would set the `color` member of the `dogs` object to `yellow`. It is important to note that the `swaggest-test` parser already dives 1 deep into the body. This means that if you have a body parameter named `color`, you don't need to specify `body.color`. `swaggest-test` will find the `color` parameter in the body and fill it automatically. However, if your parameter is deeper, such as `body.dogs.color`, you will have to specify `dogs.color`.


#### Variables
The most basic feature of `swaggest-test` is variables. Defining variables is simple, simply have a `$` in front of your variable name in a given field. For example:

```yaml
x-test:
  request:
    parameters:
      color: $color1
```

`swaggest-test` will auto-fill this with the given object. In order to specify this, you need to pass an object to the `swaggest-test` tester library as the 2nd object, like the following:

```javascript
var swaggestTest = require('swaggest-test');
swaggestTest.runTests(__dirname + '/swagger.json', {color1: 'yellow'});
```

Variables are extremely powerful, especially if you need to do things like token authentication and don't want to commit that to information to Git.

### Responses
Responses are setup in the same way as parameters, except that they are children of the response status, such as the following

```yaml
x-test:
  response:
    '200':
      message: 'SUCCESS!'
```

This example will require a '200' response with a `message` of `SUCCESS!`. Everything else from the parameters, such as nested objects, variables, and arrays carries over.

#### Type Checking
`swaggest-test` also tests the types of all of the responses. This means that if you have a member of the response object that is defined in your documentation to be a string, we verify that it actually is a string. There is no way to turn this off, because we believe that if this fails, you should update your documentation or your code, not tell `swaggest-test` to ignore it.

### Definitions
Using `$ref` in parameters e.g. `- $ref: '#/parameters/test'` is allowed, as well as using `$ref` in the body schema, like `schema: $ref: '#/parameters/test'`.

### Running Tests With flat-white
Swaggest-test includes a tool called `flat-white` which will run mocha based tests off of your swagger.json file, without the need for any setup. If you install swaggest-test globally via npm with `npm install -g swaggest-test`, you can run `flat-white swagger.json` and it will parse your swagger file and run your tests.

Have variables? Cool! Flat-white reads your environment variables, so you can either define them in your shell or create a file named `.env` that looks something like this
```
TOKEN=himom
```

This will fill in your `$TOKEN` variable with `himom`

## References
This library was originally based off of [swagger-test](https://github.com/earldouglas/swagger-test), but has been changed almost entirely.

Also huge thanks to [@saminakh](https://github.com/saminakh) and her work on the Motel swagger-test branch. She did some great work and inspired me to continue making improvements to this library!
