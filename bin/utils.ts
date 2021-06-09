import * as fs from 'fs';
import * as path from 'path';

const OpenAPI = require(path.resolve(__dirname, '../dist/index.js'));
const SwaggerParser = require("@apidevtools/swagger-parser");
const toJsonSchema = require('@openapi-contrib/openapi-schema-to-json-schema');

export const minimal_openapi = {
  "openapi": "3.0.0",
  "info": {
    "version": "0.0.1",
    "title": "hello, world"
  },
  "paths": {}
}

export const methods = ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE'];

export async function export_schema(yaml_path: string, out_dir: string) {
  let parser = new SwaggerParser();
  let r = await parser.dereference(yaml_path);

  let paths = r.paths;
  let rs: Record<string, Record<string, any>> = {};
  Object.keys(paths).map(key=>{
    let operation = paths[key];
    Object.keys(operation).map(method=>{
      if(!methods.includes(method.toUpperCase())) {
        return -1;
      }
      let operationId: string = operation[method].operationId;
      if(!!!operationId) {
        return -1;
      }
      let response = operation[method].responses;
      let code_json_schema_map: Record<string, any> = {};
      Object.keys(response).map(code=>{
        let content = response[code].content;
        if(!!!content) {
          console.log(`cannot found special code ${code} on ${yaml_path}-${operationId}`);
          return -1;
        }
        let appJson = content['application/json'];
        if(!!!appJson) {
          console.log(`cannot found application/json ${code} on ${yaml_path}-${operationId}`);
          return -1;
        }
        let schema = appJson.schema;
        if(!!!schema) {
          console.log(`cannot found ${code} schema on ${yaml_path}-${operationId}`);
          return -1;
        }

        try {
          let jsonSchema = toJsonSchema(schema);
          code_json_schema_map[code] = jsonSchema;
        } catch(e) {
          console.log(`${code} to jsonSchema failed on ${yaml_path}-${operationId}`);
        }
        return 0;
      });
      rs[operationId] = {
        responses: code_json_schema_map,
      }
      return 0;
    });
  });
  let out = JSON.stringify(rs, null, 2);
  const content = `const schemas = ${out}\n\nexport default schemas;\n`;
  const out_path = path.join(out_dir, 'schema.js');
  fs.writeFileSync(out_path, content);
}

/*
fileName: user.v1.yaml
baseDir: ../
output: src/request
*/
export async function yaml_file_to_code(fileName: string, baseDir: string, output: string) {
  if(!fileName.toLowerCase().endsWith('.yaml')) {
    return -1;
  }
  const base_name = fileName.slice(0, fileName.length - 5);
  if(!base_name) {
    return -1;
  }
  const full_path = path.join(baseDir, fileName);

  const out_dir = path.join(output, base_name)
  // 产生 api 文件
  await OpenAPI.generate({
    input: full_path,
    output: out_dir,
    useOptions: true,
    exportCore: false,
    exportModels: true,
    exportServices: true,
    exportSchemas: false,
  });
  await export_schema(full_path, out_dir);
  return 0;
}

export async function yaml_core_to_code(output: string) {
  await OpenAPI.generate({
    input: minimal_openapi,
    output: output,
    useOptions: true,
    exportCore: true,
    exportModels: false,
    exportServices: false,
    exportSchemas: false,
  });
}

async function yaml_code_generate(item: fs.Dirent, input: string, output: string) {
  if(!item.isFile()) {
    return -1;
  }
  const fname = item.name;
  // console.info(`item.name: ${item.name}`);
  return yaml_file_to_code(fname, input, output);
}

// 逐个解析 并生成代码
export async function code_generate(inputDir: string, outputDir: string) {
  let arr = fs.readdirSync(inputDir, {
    withFileTypes: true,
  });
  for(let i=0; i!==arr.length; i++) {
    let item = arr[i];
    try {
      let cur = await yaml_code_generate(item, inputDir, outputDir);
      if(cur === 0) {
        // console.log(`${item.name} code generated finished.`);
      }
    } catch(err) {
      console.error(`${item.name} code generate failed.`);
      console.error(err);
    }
  }
}
