#!/usr/bin/env node

'use strict';

const fs = require("fs");
const path = require("path");
const program = require("commander");
// const OpenAPI = require('openapi-typescript-codegen');
const OpenAPI = require(path.resolve(__dirname, '../dist/index.js'));
const SwaggerParser = require("@apidevtools/swagger-parser");
const toJsonSchema = require('@openapi-contrib/openapi-schema-to-json-schema');

const minimal_openapi = {
  "openapi": "3.0.0",
  "info": {
    "version": "0.0.1",
    "title": "hello, world"
  },
  "paths": {}
}

const methods = ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE'];

async function export_schema(yaml_path, out_dir) {
  let parser = new SwaggerParser();
  let r = await parser.dereference(yaml_path);

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
        if(!!!content) {
          console.log(`cannot found special code ${code} on ${yaml_path}-${operationId}`);
          return null;
        }
        let appJson = content['application/json'];
        if(!!!appJson) {
          console.log(`cannot found application/json ${code} on ${yaml_path}-${operationId}`);
          return null;
        }
        let schema = appJson.schema;
        if(!!!schema) {
          console.log(`cannot found ${code} schema on ${yaml_path}-${operationId}`);
          return null;
        }

        try {
          let jsonSchema = toJsonSchema(schema);
          code_json_schema_map[code] = jsonSchema;
        } catch(e) {
          console.log(`${code} to jsonSchema failed on ${yaml_path}-${operationId}`);
        }
      });
      rs[operationId] = {
        responses: code_json_schema_map,
      }
    });
  });
  let out = JSON.stringify(rs, null, 2);
  const content = `const schemas = ${out}\n\nexport default schemas;\n`;
  const out_path = path.join(out_dir, 'schema.js');
  fs.writeFileSync(out_path, content);
}

async function yaml_code_generate(item, input, output) {
  if(!item.isFile()) {
    return -1;
  }
  const fname = item.name;
  if(!fname.toLowerCase().endsWith('.yaml')) {
    return -1;
  }
  const base_name = fname.slice(0, fname.length - 5);
  if(!base_name) {
    return -1;
  }
  const full_path = path.join(input, fname);

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

/*
1. 产生 core
*/
async function main() {
  program
  .version('0.0.1')
  .option('-i, --input <input>', 'Input dir')
  .option('-o, --output <output>', 'Output dir')
  .parse(process.argv);

  const opts = program.opts();
  if(!!!opts.input) {
    console.error("Usage error!");
    return;
  }
  if(!!!opts.output) {
    console.error("Usage error!");
    return;
  }

  if(!fs.existsSync(opts.input)) {
    console.error('input not exists!');
    return;
  }
  const stat = fs.lstatSync(opts.input);
  if(!stat.isDirectory()) {
    console.error('input must be dir, failed.');
    return;
  }
  let arr = fs.readdirSync(opts.input, {
    withFileTypes: true,
  });

  // 先产生 core
  await OpenAPI.generate({
    input: minimal_openapi,
    output: opts.output,
    useOptions: true,
    exportCore: true,
    exportModels: false,
    exportServices: false,
    exportSchemas: false,
  });

  // 再逐个解析 并生成代码
  for(let i=0; i!==arr.length; i++) {
    let item = arr[i];
    try {
      let cur = await yaml_code_generate(item, opts.input, opts.output);
      if(cur === 0) {
        // console.log(`${item.name} code generated finished.`);
      }
    } catch(err) {
      console.error(`${item.name} code generate failed.`);
      console.error(err);
    }
  }
}

main().catch(err=>{
  console.trace(err);
});
