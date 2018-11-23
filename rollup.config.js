import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import minify from 'rollup-plugin-babel-minify';
import replace from 'rollup-plugin-replace';
import fs from 'fs';

function deploy() {
  return {
    generateBundle(a, bundles, isWrite) {
      if (isWrite) {
        console.log('deploying')
        fs.writeFileSync('/Users/jdean/Library/Application\ Support/Screeps/scripts/127_0_0_1___21025/default/main.js', bundles['main.js'].code, 'utf8');
      }
    }
  }
}

export default {
  input: 'src/main.js',
  output: {
    file: 'main.js',
    format: 'cjs'
  },
  watch: {
    include: ['src/**/*.js'],
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**'
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    commonjs(),
    // minify(),
    deploy(),
  ]
}
