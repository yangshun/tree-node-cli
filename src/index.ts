import fs from 'fs';
import nodePath from 'path';

import { type TreeJsonEntry, formatAsJson } from './formats/json';
import { formatAsText } from './formats/text';

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

export type RequiredOptions = Required<Options>;

const DEFAULT_OPTIONS: RequiredOptions = {
  allFiles: false,
  date: false,
  dirsFirst: false,
  dirsOnly: false,
  filesFirst: false,
  fullPath: false,
  noIndent: false,
  permissions: false,
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

const DEFAULT_EXCLUDE_PATTERNS: RegExp[] = [/\.DS_Store/];

// ── Tree node ──────────────────────────────────────────────

export interface TreeNode {
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
  currentDepth: number,
  options: RequiredOptions,
): boolean {
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

function statEntries(
  dirPath: string,
  entries: string[],
): Map<string, fs.Stats> {
  const stats = new Map<string, fs.Stats>();

  for (const entry of entries) {
    stats.set(entry, fs.lstatSync(nodePath.join(dirPath, entry)));
  }

  return stats;
}

// Sorts `contents` in place. Callers must not reuse the input array.
function sortContents(
  contents: string[],
  stats: Map<string, fs.Stats>,
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
      contents.sort((a, b) => stats.get(a)!.mtimeMs - stats.get(b)!.mtimeMs);
      break;
    case 'ctime':
      contents.sort((a, b) => stats.get(a)!.ctimeMs - stats.get(b)!.ctimeMs);
      break;
    case 'size':
      contents.sort((a, b) => stats.get(a)!.size - stats.get(b)!.size);
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
  stats: Map<string, fs.Stats>,
  options: RequiredOptions,
): string[] {
  if (!options.dirsOnly && !options.dirsFirst && !options.filesFirst) {
    return contents;
  }

  const dirSet = new Set(
    contents.filter((file) => stats.get(file)!.isDirectory()),
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
): { entries: string[]; stats: Map<string, fs.Stats> } {
  let entries = fs.readdirSync(dirPath);

  // Filter hidden files before stat'ing to avoid unnecessary syscalls.
  if (!options.allFiles) {
    entries = entries.filter((entry) => !isHiddenFile(entry));
  }

  const stats = statEntries(dirPath, entries);
  const sorted = sortContents(entries, stats, options);
  const filtered = filterAndOrderContents(sorted, stats, options);

  return { entries: filtered, stats };
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
  cachedStat?: fs.Stats,
): TreeNode | null {
  const stat = cachedStat ?? fs.lstatSync(path);
  const isDir = stat.isDirectory();
  const isFile = !isDir;

  if (isExcluded(path, currentDepth, options)) {
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

  const { entries, stats } = getDirectoryContents(path, options);

  for (const entry of entries) {
    const child = buildTree(
      entry,
      nodePath.join(path, entry),
      currentDepth + 1,
      options,
      sizeCache,
      stats.get(entry),
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

function buildTreeNode(
  path: string,
  options: RequiredOptions,
): TreeNode | null {
  const sizeCache = new Map<string, number>();

  if (options.sizes) {
    computeSizes(path, sizeCache);
  }

  const resolvedPath = nodePath.join(process.cwd(), path);
  const rootName = nodePath.basename(resolvedPath);

  return buildTree(rootName, path, 0, options, sizeCache);
}

export function tree(path: string, options?: Options): string {
  const combinedOptions: RequiredOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    exclude: [...DEFAULT_EXCLUDE_PATTERNS, ...(options?.exclude ?? [])],
  };
  const root = buildTreeNode(path, combinedOptions);

  if (!root) {
    return '';
  }

  return formatAsText(root, combinedOptions, path).join('\n');
}

export function treeJson(
  path: string,
  options?: Options,
): TreeJsonEntry | null {
  const combinedOptions: RequiredOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    exclude: [...DEFAULT_EXCLUDE_PATTERNS, ...(options?.exclude ?? [])],
  };
  const root = buildTreeNode(path, combinedOptions);

  return root ? formatAsJson(root, combinedOptions) : null;
}
