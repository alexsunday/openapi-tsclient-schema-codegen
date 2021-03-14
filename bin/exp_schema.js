const SwaggerParser = require("@apidevtools/swagger-parser");
const toJsonSchema = require('@openapi-contrib/openapi-schema-to-json-schema');

let methods = ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE'];

function main() {
  let parser = new SwaggerParser();
  parser.dereference(process.argv[2]).then(r=>{
    let paths = r.paths;
    let rs = {};
    Object.keys(paths).map(key=>{
      let operation = paths[key];
      Object.keys(operation).map(method=>{
        if(!methods.includes(method.toUpperCase())) {
          return null;
        }
        let operationId = operation[method].operationId;
        if(!!!operationId) {
          return null;
        }
        let response = operation[method].responses;
        let code_json_schema_map = {};
        Object.keys(response).map(code=>{
          let content = response[code].content;
          let appJson = content['application/json'];
          if(!!!appJson) {
            return null;
          }
          let schema = appJson.schema;
          if(!!!schema) {
            return null;
          }

          try {
            let jsonSchema = toJsonSchema(schema);
            code_json_schema_map[code] = jsonSchema;
          } catch(e) {
          }
        });
        rs[operationId] = {
          responses: code_json_schema_map,
        }
      });
    });
    let out = JSON.stringify(rs, null, 2);
    console.info(`const schemas = ${out}\n\nexport default schemas;\n`)
  });
}

main();
