import fs from 'fs';
import nodePath from 'path';
import prettyBytes from 'pretty-bytes';

export type SortBy = 'name' | 'version' | 'mtime' | 'ctime' | 'size';

export interface Options {
  allFiles?: boolean;
  dirsFirst?: boolean;
  dirsOnly?: boolean;
  filesFirst?: boolean;
  fullPath?: boolean;
  prune?: boolean;
  sizes?: boolean;
  exclude?: RegExp[];
  maxDepth?: number;
  reverse?: boolean;
  sortBy?: SortBy;
  trailingSlash?: boolean;
  lineAscii?: boolean;
  unsorted?: boolean;
}

interface RequiredOptions {
  allFiles: boolean;
  dirsFirst: boolean;
  dirsOnly: boolean;
  filesFirst: boolean;
  fullPath: boolean;
  prune: boolean;
  sizes: boolean;
  exclude: RegExp[];
  maxDepth: number;
  reverse: boolean;
  sortBy: SortBy;
  trailingSlash: boolean;
  lineAscii: boolean;
  unsorted: boolean;
}

const DEFAULT_OPTIONS: RequiredOptions = {
  allFiles: false,
  dirsFirst: false,
  dirsOnly: false,
  filesFirst: false,
  fullPath: false,
  prune: false,
  sizes: false,
  exclude: [],
  maxDepth: Number.POSITIVE_INFINITY,
  reverse: false,
  sortBy: 'name',
  trailingSlash: false,
  lineAscii: false,
  unsorted: false,
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
  rootPath: string,
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

  const displayName = options.fullPath
    ? nodePath.relative(nodePath.dirname(rootPath), path)
    : filename;
  line.push(displayName);

  if (isDir && options.trailingSlash) {
    line.push('/');
  }

  if (isFile) {
    lines.push(line.join(''));
    return lines;
  }

  // Contents of a directory.
  let contents = fs.readdirSync(path);
  if (!options.unsorted) {
    switch (options.sortBy) {
      case 'version':
        contents.sort((a, b) =>
          a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
        );
        break;
      case 'mtime':
        contents.sort(
          (a, b) =>
            fs.lstatSync(nodePath.join(path, a)).mtimeMs -
            fs.lstatSync(nodePath.join(path, b)).mtimeMs,
        );
        break;
      case 'ctime':
        contents.sort(
          (a, b) =>
            fs.lstatSync(nodePath.join(path, a)).ctimeMs -
            fs.lstatSync(nodePath.join(path, b)).ctimeMs,
        );
        break;
      case 'size':
        contents.sort(
          (a, b) =>
            fs.lstatSync(nodePath.join(path, a)).size -
            fs.lstatSync(nodePath.join(path, b)).size,
        );
        break;
      default:
        contents.sort();
        break;
    }

    if (options.reverse) {
      contents.reverse();
    }
  }

  // Handle showing of all files.
  if (!options.allFiles) {
    contents = contents.filter((content) => !isHiddenFile(content));
  }

  if (options.dirsOnly || options.dirsFirst || options.filesFirst) {
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
    } else if (options.filesFirst) {
      const dirs = contents.filter((content) => dirSet.has(content));
      const files = contents.filter((content) => !dirSet.has(content));
      contents = files.concat(dirs);
    }
  }

  const childLines: string[] = [];
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
      rootPath,
      isCurrentLast,
    );
    childLines.push(...linesForFile);
  });

  // Prune empty directories (except root).
  if (options.prune && currentDepth > 0 && childLines.length === 0) {
    return lines;
  }

  lines.push(line.join(''));
  lines.push(...childLines);

  return lines;
}

export default function tree(path: string, options?: Options): string {
  const combinedOptions: RequiredOptions = { ...DEFAULT_OPTIONS, ...options };
  const sizeCache = new Map<string, number>();

  if (combinedOptions.sizes) {
    computeSizes(path, sizeCache);
  }

  const resolvedPath = nodePath.join(process.cwd(), path);
  return print(
    nodePath.basename(resolvedPath),
    path,
    0,
    '',
    combinedOptions,
    sizeCache,
    path,
  ).join('\n');
}
