import * as fs from 'fs';
import * as program from 'commander';
import * as myUtils from './utils';

const {yaml_file_to_code, yaml_core_to_code} = myUtils;

async function yaml_code_generate(item: fs.Dirent, input: string, output: string) {
  if(!item.isFile()) {
    return -1;
  }
  const fname = item.name;
  console.info(`item.name: ${item.name}`);
  return yaml_file_to_code(fname, input, output);
}

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

  // 再逐个解析 并生成代码
  let arr = fs.readdirSync(opts.input, {
    withFileTypes: true,
  });
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

if(typeof require !== 'undefined' && require.main === module) {
  main().catch(err=>{
    console.trace(err);
  });
}
