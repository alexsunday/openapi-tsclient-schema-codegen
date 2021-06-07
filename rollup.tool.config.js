const typescript = require('rollup-plugin-typescript2');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('rollup-plugin-terser');
const jsonPlugin = require("@rollup/plugin-json");

const getPlugins = () => {
  const plugins = [
      typescript(),
      commonjs(),
      nodeResolve(),
      jsonPlugin(),
  ]
  if (process.env.NODE_ENV === 'development') {
      return plugins;
  }
  return [...plugins, terser()];
}

module.exports = [
  {
    input: './bin/codegen.ts',
    output: {
      file: './bin/codegen.js',
      format: 'cjs',
    },
    external: [
      'fs',
      'os',
      'util',
      'path',
      'http',
      'https',
    ],
    plugins: getPlugins(),
  },
  {
    input: './bin/watch.ts',
    output: {
      file: './bin/watch.js',
      format: 'cjs',
    },
    external: [
      'fs',
      'os',
      'util',
      'path',
      'http',
      'https',
      'fsevents',
      '@vue/cli-service',
    ],
    plugins: getPlugins(),
  },
];
