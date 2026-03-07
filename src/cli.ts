#!/usr/bin/env node

import { createRequire } from 'module';
import cac from 'cac';
import tree, { type Options } from './index';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const PATTERN_SEPARATOR = '|';

const cli = cac('tree');

cli
  .option('-a, --all-files', 'All files, include hidden files, are printed.')
  .option('--dirs-first', 'List directories before files.')
  .option('-d, --dirs-only', 'List directories only.')
  .option(
    '-s, --sizes',
    'Print the size of each file in bytes along with the name.',
  )
  .option(
    '-I, --exclude <patterns>',
    'Exclude files that match the pattern. | separates alternate patterns. ' +
      'Wrap your entire pattern in double quotes. E.g. "node_modules|coverage".',
  )
  .option('-L, --max-depth <n>', 'Max display depth of the directory tree.')
  .option('-r, --reverse', 'Sort the output in reverse alphabetic order.')
  .option('-F, --trailing-slash', "Append a '/' for directories.")
  .option('-S, --line-ascii', 'Turn on ASCII line graphics.')
  .option(
    '-v, --version-sort',
    'Sort the output by version (natural sort of numbers within text).',
  );

cli.help();
cli.version(version, '--version');

const parsed = cli.parse();

if (parsed.options.help || parsed.options.version) {
  process.exit(0);
}

const path = cli.args[0] || '.';
const opts = cli.options;

const options: Options = {
  ...(opts.allFiles != null && { allFiles: opts.allFiles as boolean }),
  ...(opts.dirsFirst != null && { dirsFirst: opts.dirsFirst as boolean }),
  ...(opts.dirsOnly != null && { dirsOnly: opts.dirsOnly as boolean }),
  ...(opts.sizes != null && { sizes: opts.sizes as boolean }),
  ...(opts.exclude != null && {
    exclude: (opts.exclude as string)
      .split(PATTERN_SEPARATOR)
      .map((pattern) => new RegExp(pattern)),
  }),
  ...(opts.maxDepth != null && { maxDepth: parseInt(opts.maxDepth as string) }),
  ...(opts.reverse != null && { reverse: opts.reverse as boolean }),
  ...(opts.trailingSlash != null && {
    trailingSlash: opts.trailingSlash as boolean,
  }),
  ...(opts.lineAscii != null && { lineAscii: opts.lineAscii as boolean }),
  ...(opts.versionSort != null && {
    versionSort: opts.versionSort as boolean,
  }),
};

const output = tree(path, options);
console.log(output);
