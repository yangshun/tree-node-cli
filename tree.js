'use strict';

const fs = require('fs');
const nodePath = require('path');

const DEFAULT_OPTIONS = {
  allFiles: false,
  dirsFirst: false,
  dirsOnly: false,
  trailingSlash: false,
  exclude: [],
  maxDepth: Number.POSITIVE_INFINITY,
};

const SYMBOLS = {
  BRANCH: '├── ',
  EMPTY: '',
  INDENT: '    ',
  LAST_BRANCH: '└── ',
  VERTICAL: '│   ',
};

const EXCLUDED_PATTERNS = [/\.DS_Store/];

function isHiddenFile(filename) {
  return filename[0] === '.';
}

function print(
  filename,
  path,
  currentDepth,
  precedingSymbols,
  options,
  isLast,
) {
  const isFile = fs.lstatSync(path).isFile();
  const isDir = !isFile;

  const lines = [];
  // Do not show these regardless.
  for (let i = 0; i < EXCLUDED_PATTERNS.length; i++) {
    if (EXCLUDED_PATTERNS[i].test(path)) {
      return lines;
    }
  }

  // Handle directories only.
  if (isFile && options.dirsOnly) {
    return lines;
  }

  // Handle excluded patterns.
  for (let i = 0; i < options.exclude.length; i++) {
    if (options.exclude[i].test(path)) {
      return lines;
    }
  }

  // Handle showing of all files.
  if (!options.allFiles && isHiddenFile(filename)) {
    return lines;
  }

  // Handle max depth.
  if (currentDepth > options.maxDepth) {
    return lines;
  }

  // Handle current file.
  const line = [precedingSymbols];
  if (currentDepth >= 1) {
    line.push(isLast ? SYMBOLS.LAST_BRANCH : SYMBOLS.BRANCH);
  }
  line.push(filename);
  if (isDir && options.trailingSlash) {
    line.push('/');
  }
  lines.push(line.join(''));

  if (isFile) {
    return lines;
  }

  let contents = fs.readdirSync(path);
  // Handle directory files.
  if (options.dirsOnly) {
    // We have to filter here instead of at the start of the function
    // because we need to know how many non-directories there are before
    // we even start recursing.
    contents = contents.filter(
      file => !fs.lstatSync(nodePath.join(path, file)).isFile(),
    );
  }

  // Sort directories first.
  if (options.dirsFirst) {
    const dirs = contents.filter(
      content => !fs.lstatSync(nodePath.join(path, content)).isFile(),
    );
    const files = contents.filter(content =>
      fs.lstatSync(nodePath.join(path, content)).isFile(),
    );
    contents = [...dirs, ...files];
  }

  contents.forEach((content, index) => {
    const isCurrentLast = index === contents.length - 1;
    const linesForFile = print(
      content,
      nodePath.join(path, content),
      currentDepth + 1,
      precedingSymbols +
        (currentDepth >= 1
          ? isLast
            ? SYMBOLS.INDENT
            : SYMBOLS.VERTICAL
          : SYMBOLS.EMPTY),
      options,
      isCurrentLast,
    );
    lines.push(...linesForFile);
  });
  return lines;
}

function tree(path, options) {
  const combinedOptions = { ...DEFAULT_OPTIONS, ...options };
  return print(
    nodePath.basename(nodePath.join(process.cwd(), path)),
    path,
    0,
    '',
    combinedOptions,
  ).join('\n');
}

module.exports = tree;
