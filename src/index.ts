import fs from 'fs';
import nodePath from 'path';
import prettyBytes from 'pretty-bytes';

export type SortBy = 'name' | 'version' | 'mtime' | 'ctime' | 'size';

export interface Options {
  allFiles?: boolean;
  date?: boolean;
  dirsFirst?: boolean;
  dirsOnly?: boolean;
  filesFirst?: boolean;
  fullPath?: boolean;
  noIndent?: boolean;
  permissions?: boolean;
  prune?: boolean;
  json?: boolean;
  quote?: boolean;
  sizes?: boolean;
  exclude?: RegExp[];
  maxDepth?: number;
  reverse?: boolean;
  sortBy?: SortBy;
  trailingSlash?: boolean;
  lineAscii?: boolean;
  unsorted?: boolean;
}

type RequiredOptions = Required<Options>;

const DEFAULT_OPTIONS: RequiredOptions = {
  allFiles: false,
  date: false,
  dirsFirst: false,
  dirsOnly: false,
  filesFirst: false,
  fullPath: false,
  noIndent: false,
  permissions: false,
  json: false,
  prune: false,
  quote: false,
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

// ── Tree node ──────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  mode: number;
  mtime: Date;
  size: number;
  children: TreeNode[];
}

// ── Build tree ─────────────────────────────────────────────

function isHiddenFile(filename: string): boolean {
  return filename[0] === '.';
}

function isExcluded(
  path: string,
  isFile: boolean,
  currentDepth: number,
  options: RequiredOptions,
): boolean {
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(path)) {
      return true;
    }
  }

  if (isFile && options.dirsOnly) {
    return true;
  }

  for (const pattern of options.exclude) {
    if (pattern.test(path)) {
      return true;
    }
  }

  if (currentDepth > options.maxDepth) {
    return true;
  }

  return false;
}

function sortContents(
  contents: string[],
  dirPath: string,
  options: RequiredOptions,
): string[] {
  if (options.unsorted) {
    return contents;
  }

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
          fs.lstatSync(nodePath.join(dirPath, a)).mtimeMs -
          fs.lstatSync(nodePath.join(dirPath, b)).mtimeMs,
      );
      break;
    case 'ctime':
      contents.sort(
        (a, b) =>
          fs.lstatSync(nodePath.join(dirPath, a)).ctimeMs -
          fs.lstatSync(nodePath.join(dirPath, b)).ctimeMs,
      );
      break;
    case 'size':
      contents.sort(
        (a, b) =>
          fs.lstatSync(nodePath.join(dirPath, a)).size -
          fs.lstatSync(nodePath.join(dirPath, b)).size,
      );
      break;
    default:
      contents.sort();
      break;
  }

  if (options.reverse) {
    contents.reverse();
  }

  return contents;
}

function filterAndOrderContents(
  contents: string[],
  dirPath: string,
  options: RequiredOptions,
): string[] {
  if (!options.allFiles) {
    contents = contents.filter((content) => !isHiddenFile(content));
  }

  if (!options.dirsOnly && !options.dirsFirst && !options.filesFirst) {
    return contents;
  }

  const dirSet = new Set(
    contents.filter((file) =>
      fs.lstatSync(nodePath.join(dirPath, file)).isDirectory(),
    ),
  );

  if (options.dirsOnly) {
    return contents.filter((file) => dirSet.has(file));
  }

  const dirs = contents.filter((content) => dirSet.has(content));
  const files = contents.filter((content) => !dirSet.has(content));

  if (options.dirsFirst) {
    return dirs.concat(files);
  }

  // filesFirst
  return files.concat(dirs);
}

function getDirectoryContents(
  dirPath: string,
  options: RequiredOptions,
): string[] {
  const contents = fs.readdirSync(dirPath);
  const sorted = sortContents(contents, dirPath, options);
  return filterAndOrderContents(sorted, dirPath, options);
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

function buildTree(
  filename: string,
  path: string,
  currentDepth: number,
  options: RequiredOptions,
  sizeCache: Map<string, number>,
): TreeNode | null {
  const stat = fs.lstatSync(path);
  const isDir = stat.isDirectory();
  const isFile = !isDir;

  if (isExcluded(path, isFile, currentDepth, options)) {
    return null;
  }

  const node: TreeNode = {
    name: filename,
    path,
    isDirectory: isDir,
    mode: stat.mode,
    mtime: stat.mtime,
    size: sizeCache.get(path) ?? stat.size,
    children: [],
  };

  if (isFile) {
    return node;
  }

  const contents = getDirectoryContents(path, options);

  for (const entry of contents) {
    const child = buildTree(
      entry,
      nodePath.join(path, entry),
      currentDepth + 1,
      options,
      sizeCache,
    );
    if (child) {
      node.children.push(child);
    }
  }

  // Prune empty directories (except root).
  if (options.prune && currentDepth > 0 && node.children.length === 0) {
    return null;
  }

  return node;
}

// ── Format as text ─────────────────────────────────────────

function formatPermissions(mode: number, isDir: boolean): string {
  const type = isDir ? 'd' : '-';
  const rwx = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
  const owner = rwx[(mode >> 6) & 7];
  const group = rwx[(mode >> 3) & 7];
  const others = rwx[mode & 7];
  return `[${type}${owner}${group}${others}]`;
}

function formatAsText(
  node: TreeNode,
  options: RequiredOptions,
  rootPath: string,
  precedingSymbols: string = '',
  currentDepth: number = 0,
  isLast?: boolean,
): string[] {
  const SYMBOLS = options.lineAscii ? SYMBOLS_ASCII : SYMBOLS_ANSI;

  // Build the line for this entry.
  const line: string[] = options.noIndent ? [] : [precedingSymbols];

  if (!options.noIndent && currentDepth >= 1) {
    line.push(isLast ? SYMBOLS.LAST_BRANCH : SYMBOLS.BRANCH);
  }

  if (options.permissions) {
    line.push(formatPermissions(node.mode, node.isDirectory));
    line.push(' ');
  }

  if (options.date) {
    const dateStr = `[${node.mtime.toLocaleDateString('en-CA')} ${node.mtime.toLocaleTimeString('en-GB')}]`;
    line.push(dateStr);
    line.push(' ');
  }

  if (options.sizes) {
    const prettifiedFilesize = prettyBytes(node.size);
    line.push(prettifiedFilesize.replace(' ', ''));
    line.push(' ');
  }

  const displayName = options.fullPath
    ? nodePath.relative(nodePath.dirname(rootPath), node.path)
    : node.name;
  line.push(options.quote ? `"${displayName}"` : displayName);

  if (node.isDirectory && options.trailingSlash) {
    line.push('/');
  }

  const lines = [line.join('')];

  // Recurse into children.
  node.children.forEach((child, index) => {
    const isCurrentLast = index === node.children.length - 1;
    const childLines = formatAsText(
      child,
      options,
      rootPath,
      options.noIndent
        ? ''
        : precedingSymbols +
          (currentDepth >= 1
            ? isLast
              ? SYMBOLS.INDENT
              : SYMBOLS.VERTICAL
            : SYMBOLS.EMPTY),
      currentDepth + 1,
      isCurrentLast,
    );
    lines.push(...childLines);
  });

  return lines;
}

// ── Format as JSON ─────────────────────────────────────────

interface JsonNode {
  type: 'directory' | 'file';
  name: string;
  size?: number;
  mode?: string;
  time?: string;
  contents?: JsonNode[];
}

function formatAsJson(node: TreeNode, options: RequiredOptions): JsonNode {
  const jsonNode: JsonNode = {
    type: node.isDirectory ? 'directory' : 'file',
    name: node.name,
  };

  if (options.sizes) {
    jsonNode.size = node.size;
  }

  if (options.permissions) {
    jsonNode.mode = formatPermissions(node.mode, node.isDirectory);
  }

  if (options.date) {
    jsonNode.time = `${node.mtime.toLocaleDateString('en-CA')} ${node.mtime.toLocaleTimeString('en-GB')}`;
  }

  if (node.isDirectory) {
    jsonNode.contents = node.children.map((child) =>
      formatAsJson(child, options),
    );
  }

  return jsonNode;
}

// ── Public API ─────────────────────────────────────────────

export default function tree(path: string, options?: Options): string {
  const combinedOptions: RequiredOptions = { ...DEFAULT_OPTIONS, ...options };
  const sizeCache = new Map<string, number>();

  if (combinedOptions.sizes) {
    computeSizes(path, sizeCache);
  }

  const resolvedPath = nodePath.join(process.cwd(), path);
  const rootName = nodePath.basename(resolvedPath);
  const root = buildTree(rootName, path, 0, combinedOptions, sizeCache);

  if (combinedOptions.json) {
    const jsonTree = root ? formatAsJson(root, combinedOptions) : null;
    return JSON.stringify([jsonTree], null, 2);
  }

  if (!root) {
    return '';
  }

  return formatAsText(root, combinedOptions, path).join('\n');
}
