const fs = require('fs');
const nodePath = require('path');

const DEFAULT_OPTIONS = {
  directoriesOnly: false,
  directoriesTrailingSlash: false,
  excludeDirs: [],
  hideHiddenFiles: true,
  maxDepth: Number.POSITIVE_INFINITY,
};

const SYMBOLS = {
  BRANCH: '├── ',
  EMPTY: '',
  INDENT: '    ',
  LAST_BRANCH: '└── ',
  VERTICAL: '│   ',
};

// Files we want to exclude no matter what.
const EXCLUSIONS = [
  '.DS_Store',
];

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
  // Handle directories only.
  if (isFile && options.directoriesOnly) {
    return lines;
  }

  // Handle excluded dirs.
  if (isDir && options.excludeDirs.includes(filename)) {
    return lines;
  }

  // Handle hidden files.
  if (options.hideHiddenFiles && isHiddenFile(filename)) {
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
  if (isDir && options.directoriesTrailingSlash) {
    line.push('/');
  }
  lines.push(line.join(''));

  if (isFile) {
    return lines;
  }

  // Handle directory files.
  let files = fs.readdirSync(path)
    .filter(
      file => !EXCLUSIONS.includes(file)
    );
  if (options.directoriesOnly) {
    // We have to filter here instead of at the start of the function
    // because we need to know how many non-directories there are before
    // we even start recursing.
    files = files.filter(file => {
      const filePath = nodePath.join(path, file);
      return !fs.lstatSync(filePath).isFile();
    })
  }

  files.forEach((file, index) => {
    const isCurrentLast = index === files.length - 1;
    const linesForFile = print(
      file,
      nodePath.join(path, file),
      currentDepth + 1,
      precedingSymbols +
        (currentDepth >= 1
          ? isLast ? SYMBOLS.INDENT : SYMBOLS.VERTICAL
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
  return print(nodePath.basename(path), path, 0, '', combinedOptions).join(
    '\n',
  );
}

module.exports = tree;
