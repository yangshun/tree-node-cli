const fs = require('fs');
const nodePath = require('path');

const DEFAULT_OPTIONS = {
  allFiles: false,
  dirOnly: false,
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
  if (isFile && options.dirOnly) {
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

  // Handle directory files.
  let files = fs.readdirSync(path);
  if (options.dirOnly) {
    // We have to filter here instead of at the start of the function
    // because we need to know how many non-directories there are before
    // we even start recursing.
    files = files.filter(file => {
      const filePath = nodePath.join(path, file);
      return !fs.lstatSync(filePath).isFile();
    });
  }

  files.forEach((file, index) => {
    const isCurrentLast = index === files.length - 1;
    const linesForFile = print(
      file,
      nodePath.join(path, file),
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
  combinedOptions.exclude = combinedOptions.exclude.map(
    pattern => new RegExp(pattern),
  );

  return print(
    nodePath.basename(nodePath.join(process.cwd(), path)),
    path,
    0,
    '',
    combinedOptions,
  ).join('\n');
}

module.exports = tree;
