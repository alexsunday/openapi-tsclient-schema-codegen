import * as fs from 'fs';
import * as path from 'path';
import { load as yamlLoad } from 'js-yaml';

const OpenAPI = require(path.resolve(__dirname, '../dist/index.js'));

export const minimal_openapi = {
  "openapi": "3.0.0",
  "info": {
    "version": "0.0.1",
    "title": "hello, world"
  },
  "paths": {}
}

export const methods = ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE'];

// export yaml to json
async function write_openapi_json(yaml_path: string, out_dir: string) {
  const content = fs.readFileSync(yaml_path, 'utf-8');
  const doc = yamlLoad(content);
  const out_path = path.join(out_dir, 'api.json');
  fs.writeFileSync(out_path, JSON.stringify(doc, null, 2));
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
  // await export_schema(full_path, out_dir);
  await write_openapi_json(full_path, out_dir);
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
