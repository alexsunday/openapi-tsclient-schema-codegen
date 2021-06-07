/*
提供一个 watch 程序，使之可以在yaml 文件夹变动后，只修改变动的文件夹
package.json:
  "vuePlugins": {
    "service": [
      "./node_modules/.bin/watch"
    ]
  }
*/

import * as path from 'path';
import * as chokidar from 'chokidar';
import {PluginAPI, ProjectOptions} from '@vue/cli-service';
import {yaml_file_to_code, yaml_core_to_code} from './utils';

type tsCodegenOptions = {
  yamlPath?: string;
  codePath?: string;
  genCore?: boolean;
  removeFirst?: boolean;
}

function fileChanged(evt: string, fullPath: string, output: string) {
  const baseName = path.basename(fullPath);
  if(baseName === fullPath) {
    return -1;
  }
  if(!baseName.toLocaleLowerCase().endsWith('.yaml')) {
    // not yaml
    return -1;
  }
  const dirName = path.dirname(fullPath);
  console.info(`file ${baseName} ${evt}`);
  yaml_file_to_code(baseName, dirName, output);
  return 0;
}

function fa(opt: tsCodegenOptions) {
  const yamlPath = opt.yamlPath || './src/yaml';
  const codePath = opt.codePath || './src/request';
  const genCore = opt.genCore === undefined ? true : opt.genCore;
  const removeFirst = opt.removeFirst === undefined ? false : opt.removeFirst;

  // 先产生 core 异步
  if(genCore) {
    yaml_core_to_code(codePath);
  }
  const watcher = chokidar.watch(yamlPath, {
    persistent: true,
    depth: 0,
  });
  watcher.on('add', path=>{
    fileChanged('add', path, codePath);
  }).on('change', path=>{
    fileChanged('change', path, codePath);
  }).on('unlink', path=>{
    console.warn(`file unlinked. ${path}`);
  }).on('ready', ()=>{
    console.info(`watch ready!`);
  }).on('error', path=>{
    console.error(`error at: ${path}`);
  });
  console.info(`watch at ${yamlPath}`);
}

/*
vue.config.js

pluginOptions: {
  codegen: {
  }
}
*/

module.exports = (api: PluginAPI, projectOptions: ProjectOptions) => {
  const {serve, build} = api.service.commands;
  const serveFn = serve.fn;
  // const buildFn = build.fn;
  let opts:any = projectOptions.pluginOptions;
  let codegenOpt = opts?.codegen as tsCodegenOptions;
  if(codegenOpt === undefined) {
    codegenOpt = {};
  }

  serve.fn = (...args: any[]) => {
    fa(codegenOpt);
    serveFn(...args);
  }
  // build.fn = (...args) => {
  //   fa({});
  //   buildFn(...args);
  // }
}

/*
fa({
  yamlPath: './test/yaml',
  codePath: './test/dist',
  genCore: true,
});
*/
