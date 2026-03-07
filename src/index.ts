import fs from 'fs';
import nodePath from 'path';
import prettyBytes from 'pretty-bytes';

export interface Options {
  allFiles?: boolean;
  dirsFirst?: boolean;
  dirsOnly?: boolean;
  sizes?: boolean;
  exclude?: RegExp[];
  maxDepth?: number;
  reverse?: boolean;
  trailingSlash?: boolean;
  lineAscii?: boolean;
  versionSort?: boolean;
}

interface RequiredOptions {
  allFiles: boolean;
  dirsFirst: boolean;
  dirsOnly: boolean;
  sizes: boolean;
  exclude: RegExp[];
  maxDepth: number;
  reverse: boolean;
  trailingSlash: boolean;
  lineAscii: boolean;
  versionSort: boolean;
}

const DEFAULT_OPTIONS: RequiredOptions = {
  allFiles: false,
  dirsFirst: false,
  dirsOnly: false,
  sizes: false,
  exclude: [],
  maxDepth: Number.POSITIVE_INFINITY,
  reverse: false,
  trailingSlash: false,
  lineAscii: false,
  versionSort: false,
};

const SYMBOLS_ANSI = {
  BRANCH: '├── ',
  EMPTY: '',
  INDENT: '    ',
  LAST_BRANCH: '└── ',
  VERTICAL: '│   ',
};

const SYMBOLS_ASCII = {
  BRANCH: '|-- ',
  EMPTY: '',
  INDENT: '    ',
  LAST_BRANCH: '`-- ',
  VERTICAL: '|   ',
};

const EXCLUDED_PATTERNS = [/\.DS_Store/];

function isHiddenFile(filename: string): boolean {
  return filename[0] === '.';
}

function computeSizes(dirPath: string, cache: Map<string, number>): number {
  let size = 0;

  for (const entry of fs.readdirSync(dirPath)) {
    const entryPath = nodePath.join(dirPath, entry);
    const stat = fs.lstatSync(entryPath);

    if (stat.isDirectory()) {
      size += computeSizes(entryPath, cache);
    } else {
      const fileSize = stat.size;
      cache.set(entryPath, fileSize);
      size += fileSize;
    }
  }

  cache.set(dirPath, size);
  return size;
}

function print(
  filename: string,
  path: string,
  currentDepth: number,
  precedingSymbols: string,
  options: RequiredOptions,
  sizeCache: Map<string, number>,
  isLast?: boolean,
): string[] {
  const isDir = fs.lstatSync(path).isDirectory();
  // We treat all non-directory paths as files and don't
  // recurse into them, including symlinks, sockets, etc.
  const isFile = !isDir;

  const lines: string[] = [];

  const SYMBOLS = options.lineAscii ? SYMBOLS_ASCII : SYMBOLS_ANSI;

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

  // Handle max depth.
  if (currentDepth > options.maxDepth) {
    return lines;
  }

  // Handle current file.
  const line: string[] = [precedingSymbols];
  if (currentDepth >= 1) {
    line.push(isLast ? SYMBOLS.LAST_BRANCH : SYMBOLS.BRANCH);
  }
  if (options.sizes) {
    const filesize = sizeCache.get(path) ?? 0;
    const prettifiedFilesize = prettyBytes(filesize);
    line.push(prettifiedFilesize.replace(' ', ''));
    line.push(' ');
  }
  line.push(filename);
  if (isDir && options.trailingSlash) {
    line.push('/');
  }
  lines.push(line.join(''));

  if (isFile) {
    return lines;
  }

  // Contents of a directory.
  let contents = fs.readdirSync(path);
  if (options.versionSort) {
    contents.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  } else {
    contents.sort();
  }

  if (options.reverse) {
    contents.reverse();
  }

  // Handle showing of all files.
  if (!options.allFiles) {
    contents = contents.filter((content) => !isHiddenFile(content));
  }

  if (options.dirsOnly || options.dirsFirst) {
    const dirSet = new Set(
      contents.filter((file) =>
        fs.lstatSync(nodePath.join(path, file)).isDirectory(),
      ),
    );

    if (options.dirsOnly) {
      // We have to filter here instead of at the start of the function
      // because we need to know how many non-directories there are before
      // we even start recursing.
      contents = contents.filter((file) => dirSet.has(file));
    } else if (options.dirsFirst) {
      const dirs = contents.filter((content) => dirSet.has(content));
      const files = contents.filter((content) => !dirSet.has(content));
      contents = dirs.concat(files);
    }
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
      sizeCache,
      isCurrentLast,
    );
    lines.push(...linesForFile);
  });
  return lines;
}

export default function tree(path: string, options?: Options): string {
  const combinedOptions: RequiredOptions = { ...DEFAULT_OPTIONS, ...options };
  const sizeCache = new Map<string, number>();
  if (combinedOptions.sizes) {
    computeSizes(path, sizeCache);
  }
  return print(
    nodePath.basename(nodePath.join(process.cwd(), path)),
    path,
    0,
    '',
    combinedOptions,
    sizeCache,
  ).join('\n');
}
