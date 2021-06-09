#!/usr/bin/env node

import * as fs from 'fs';
import * as program from 'commander';
import * as myUtils from './utils';

const {code_generate, yaml_core_to_code} = myUtils;

/*
1. 产生 core
*/
async function main() {
  program
  .version('0.0.1')
  .option('-i, --input <input>', 'Input dir')
  .option('-o, --output <output>', 'Output dir')
  .option('-r, --remove', 'remove exists dir')
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
  // 输出要么不存在 要么是文件夹 不可以是其他文件
  if(fs.existsSync(opts.output)) {
    const out_stat = fs.lstatSync(opts.output);
    if(!stat.isDirectory()) {
      console.error('output must be dir or not exists, failed.');
      return;
    }
  }

  // 如果需要先删除输出目录
  if(opts.remove) {
    // for 14.14.0 or later.
    // fs.rmSync(opts.output, {
    //   force: false,
    //   maxRetries: 0,
    //   recursive: true,
    // });
    fs.rmdirSync(opts.output, {
      maxRetries: 0,
      recursive: true,
    });
  }

  // 先产生 core
  yaml_core_to_code(opts.output);

  // 再产生其他 yaml 代码
  code_generate(opts.input, opts.output);
}

if(typeof require !== 'undefined' && require.main === module) {
  main().catch(err=>{
    console.trace(err);
  });
}
