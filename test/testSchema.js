// this file is to try out schema validation with node without having to deploy the plugin first

const Ajv = require("../lib/ajv2020.bundle");
const fs = require("fs");

const metaSchema = JSON.parse(fs.readFileSync(__dirname + "/../content/schema/json-schema-draft-07.json"));
const schema = JSON.parse(fs.readFileSync(__dirname + "/../content/schema/search-library.json"));
const testData = [
  {
    data: {
      libraryID: 1,
      query: {
        "authors": ["contain", "foo"]
      },
      resultType: "items"
    }, shouldPass: true
  },
  {
    data: {
      libraryID: "foo",
      query: {
        "authors": ["contain", "foo"]
      },
      resultType: "items"
    }, shouldPass: false
  },
  {
    data: {
      libraryID: 1,
      query: {
        "authors": ["contain", "foo"]
      },
      resultType: "foo"
    }, shouldPass: false
  }
];

const ref = '#/definitions/RequestType';
const options = {strict: false, validateSchema: true}; // validateSchema can be false in plugin
const ajv = new Ajv(options);
ajv.addSchema([metaSchema, schema]);
for (test of testData) {
  if (ajv.validate(ref, test.data) !== test.shouldPass) {
    let result;
    if (test.shouldPass) {
      result = {
        error: 'Request data validation failed',
        diagnostics: ajv.errorsText(),
      };
    } else {
      result = {
        error: 'Test passed, even though it should have failed',
        diagnostics: test.data
      };
    }

  } else {
    result = "Passed.";
  }
  console.log(result);
}
