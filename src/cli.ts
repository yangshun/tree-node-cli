#!/usr/bin/env node

import { createRequire } from 'module';
import { Command } from 'commander';
import tree, { type Options } from './index';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

interface CliOptions {
  allFiles?: boolean;
  dirsFirst?: boolean;
  dirsOnly?: boolean;
  sizes?: boolean;
  exclude?: string[];
  maxDepth?: number;
  reverse?: boolean;
  trailingSlash?: boolean;
  lineAscii?: boolean;
}

const PATTERN_SEPARATOR = '|';

const program = new Command();

program
  .version(version, '-V, --version')
  .argument('[path]', 'Directory to list', '.')
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
const path = program.processedArgs[0] as string;

const opts = program.opts<CliOptions>();

const options: Options = {
  ...(opts.allFiles != null && { allFiles: opts.allFiles }),
  ...(opts.dirsFirst != null && { dirsFirst: opts.dirsFirst }),
  ...(opts.dirsOnly != null && { dirsOnly: opts.dirsOnly }),
  ...(opts.sizes != null && { sizes: opts.sizes }),
  ...(opts.exclude != null && {
    exclude: opts.exclude.map((pattern) => new RegExp(pattern)),
  }),
  ...(opts.maxDepth != null && { maxDepth: opts.maxDepth }),
  ...(opts.reverse != null && { reverse: opts.reverse }),
  ...(opts.trailingSlash != null && { trailingSlash: opts.trailingSlash }),
  ...(opts.lineAscii != null && { lineAscii: opts.lineAscii }),
};

const output = tree(path, options);
console.log(output);
