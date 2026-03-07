#!/usr/bin/env node

import { createRequire } from 'module';
import cac from 'cac';
import { type Options, tree, treeJson } from './index';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const PATTERN_SEPARATOR = '|';

const cli = cac('tree');

cli
  .option('-a, --all-files', 'All files, including hidden files, are printed.')
  .option('-D, --date', 'Show last modification time for each entry.')
  .option('-f, --full-path', 'Print the full path prefix for each file.')
  .option('-i, --no-indent', 'Print entries without tree indentation lines.')
  .option('-J, --json', 'Output the tree as a JSON structure.')
  .option('-p, --permissions', 'Show file type and permissions.')
  .option('-Q, --quote', 'Quote filenames in double quotes.')
  .option('--prune', 'Remove empty directories from output.')
  .option('--dirs-first, --dirsfirst', 'List directories before files.')
  .option('-d, --dirs-only', 'List directories only.')
  .option(
    '-s, --sizes',
    'Print the size of each file in bytes along with the name.',
  )
  .option(
    '--du',
    'For each directory report its size as the accumulation of sizes of all its files and sub-directories. Implies -s.',
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
  )
  .option('-t, --sort-mtime', 'Sort the output by last modification time.')
  .option('-c, --sort-ctime', 'Sort the output by last status change time.')
  .option('-U, --unsorted', 'Do not sort. List files in directory order.')
  .option('--files-first, --filesfirst', 'List files before directories.')
  .option(
    '--sort <type>',
    'Sort the output by type: name, version, mtime, ctime, size.',
  )
  .option(
    '--gitignore',
    'Respect .gitignore files (enabled by default). Use --no-gitignore to disable.',
  );

cli.help();
cli.version(version, '--version');

const parsed = cli.parse();

if (parsed.options.help || parsed.options.version) {
  process.exit(0);
}

const path = cli.args[0] || '.';
const opts = cli.options;

// Resolve sortBy from shorthand flags (-v, -t, -c) or --sort flag.
const sortBy = opts.sort
  ? (opts.sort as Options['sortBy'])
  : opts.versionSort
    ? ('version' as const)
    : opts.sortMtime
      ? ('mtime' as const)
      : opts.sortCtime
        ? ('ctime' as const)
        : undefined;

const options: Options = {
  ...(opts.allFiles != null && { allFiles: opts.allFiles as boolean }),
  ...(opts.date != null && { date: opts.date as boolean }),
  ...(opts.dirsFirst != null && { dirsFirst: opts.dirsFirst as boolean }),
  ...(opts.dirsOnly != null && { dirsOnly: opts.dirsOnly as boolean }),
  ...(opts.filesFirst != null && { filesFirst: opts.filesFirst as boolean }),
  ...(opts.fullPath != null && { fullPath: opts.fullPath as boolean }),
  // cac treats --no-indent as negation of indent (default indent: true).
  // Detect -i or --no-indent via process.argv since cac can't distinguish.
  ...((process.argv.includes('-i') || process.argv.includes('--no-indent')) && {
    noIndent: true,
  }),
  ...(opts.permissions != null && { permissions: opts.permissions as boolean }),
  ...(opts.prune != null && { prune: opts.prune as boolean }),
  ...(opts.quote != null && { quote: opts.quote as boolean }),
  ...(opts.sizes != null && { sizes: opts.sizes as boolean }),
  ...(opts.du != null && { du: opts.du as boolean }),
  ...(opts.exclude != null && {
    exclude: (opts.exclude as string)
      .split(PATTERN_SEPARATOR)
      .map((pattern) => new RegExp(pattern)),
  }),
  ...(opts.maxDepth != null && { maxDepth: parseInt(opts.maxDepth as string) }),
  ...(opts.reverse != null && { reverse: opts.reverse as boolean }),
  ...(sortBy != null && { sortBy }),
  ...(opts.trailingSlash != null && {
    trailingSlash: opts.trailingSlash as boolean,
  }),
  ...(opts.lineAscii != null && { lineAscii: opts.lineAscii as boolean }),
  ...(opts.unsorted != null && { unsorted: opts.unsorted as boolean }),
  ...(opts.gitignore != null && { gitignore: opts.gitignore as boolean }),
};

if (opts.json) {
  const jsonOutput = treeJson(path, options);
  console.log(JSON.stringify([jsonOutput], null, 2));
} else {
  console.log(tree(path, options));
}
