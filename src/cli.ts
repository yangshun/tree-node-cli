#!/usr/bin/env node

import { createRequire } from 'module';
import { Command } from 'commander';
import tree from './index';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

const PATTERN_SEPARATOR = '|';

program
  .version(version, '-V, --version')
  .option('-a, --all-files', 'All files, include hidden files, are printed.')
  .option('--dirs-first', 'List directories before files.')
  .option('-d, --dirs-only', 'List directories only.')
  .option(
    '-s, --sizes',
    'Print the size of each file in bytes along with the name.',
  )
  .option(
    '-I, --exclude [patterns]',
    'Exclude files that match the pattern. | separates alternate patterns. ' +
      'Wrap your entire pattern in double quotes. E.g. `"node_modules|coverage".',
    (string: string) => string.split(PATTERN_SEPARATOR),
  )
  .option(
    '-L, --max-depth <n>',
    'Max display depth of the directory tree.',
    parseInt,
  )
  .option('-r, --reverse', 'Sort the output in reverse alphabetic order.')
  .option('-F, --trailing-slash', "Append a '/' for directories.")
  .option('-S, --line-ascii', 'Turn on ASCII line graphics.');

program.parse(process.argv);
const path = program.args[0] || '.'; // Defaults to CWD if not specified.

const opts = program.opts();

const options: Record<string, unknown> = {
  allFiles: opts.allFiles,
  dirsFirst: opts.dirsFirst,
  dirsOnly: opts.dirsOnly,
  sizes: opts.sizes,
  exclude: opts.exclude,
  maxDepth: opts.maxDepth,
  reverse: opts.reverse,
  trailingSlash: opts.trailingSlash,
  lineAscii: opts.lineAscii,
};

Object.keys(options).forEach((key) => {
  if (options[key] === undefined) {
    delete options[key];
  }
});

if (options.exclude) {
  options.exclude = (options.exclude as string[]).map(
    (pattern) => new RegExp(pattern),
  );
}

const output = tree(path, options);
console.log(output);
