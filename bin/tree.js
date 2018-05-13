#!/usr/bin/env node
'use strict';

const program = require('commander');

const pkg = require('../package.json');
const tree = require('../tree');

const PATTERN_SEPARATOR = '|';

program
  .version(pkg.version)
  .option('-a, --all-files', 'All files, include hidden files, are printed.')
  .option('-d, --dir-only', 'List directories only.')
  .option(
    '-I, --exclude [patterns]',
    'Exclude files that match the pattern. | separates alternate patterns. ' +
      'Wrap your entire pattern in double quotes. E.g. `"node_modules|lcov".',
    string => string.split(PATTERN_SEPARATOR),
  )
  .option(
    '-L, --max-depth <n>',
    'Max display depth of the directory tree.',
    parseInt,
  )
  .option('--trailing-slash', 'Add a trailing slash behind directories.');

program.parse(process.argv);
const path = program.args[0] || '.'; // Defaults to CWD if not specified.

const options = {
  allFiles: program.allFiles,
  dirOnly: program.dirOnly,
  exclude: program.exclude,
  maxDepth: program.maxDepth,
  trailingSlash: program.trailingSlash,
};

Object.keys(options).forEach(key => {
  if (options[key] === undefined) {
    delete options[key];
  }
});

if (options.exclude) {
  options.exclude = options.exclude.map(pattern => new RegExp(pattern));
}

console.log(tree(path, options));
