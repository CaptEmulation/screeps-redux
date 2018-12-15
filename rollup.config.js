import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import minify from 'rollup-plugin-babel-minify';
import replace from 'rollup-plugin-replace';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT = (function () {
  const platform = os.platform();
  switch(platform) {
    case 'darwin':
      return 'Library/Application Support/Screeps/scripts';
    case 'win32':
      return 'AppData/Local/Screeps/scripts';
    default:
      return '.config/Screeps/scripts';
  }
})();

function deploy(host) {
  return {
    generateBundle(a, bundles, isWrite) {
      if (isWrite) {
        const mainjs = path.resolve(os.homedir(), ROOT, host, 'default/main.js');
        console.log('Writing', mainjs);
        fs.writeFileSync(mainjs, bundles['main.js'].code, 'utf8');
        const map = `module.exports.d=${bundles['main.js'].map}`;
        fs.writeFileSync(path.resolve(os.homedir(), ROOT, host, 'default/main.js.map'), map, 'utf8');
      }
    }
  }
}

export default ({
  host = '127_0_0_1___21025',
}) => ({
  input: 'src/app.js',
  output: {
    file: 'main.js',
    format: 'cjs',
    sourcemap: true,
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
    deploy(host),
  ]
})
