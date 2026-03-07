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
  du?: boolean;
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
  du: false,
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
  openError?: boolean;
}

// ── Build tree ─────────────────────────────────────────────

/**
 * Checks whether a filename starts with a dot (hidden file convention).
 */
function isHiddenFile(filename: string): boolean {
  return filename[0] === '.';
}

/**
 * Checks whether a path matches any of the configured exclude patterns.
 */
function matchesExcludePattern(
  path: string,
  options: RequiredOptions,
): boolean {
  for (const pattern of options.exclude) {
    if (pattern.test(path)) {
      return true;
    }
  }

  return false;
}

/**
 * Calls `lstatSync` on each entry and returns a map of filename to stats.
 * Uses `lstatSync` (not `statSync`) so symlinks are not followed.
 */
function statEntries(
  dirPath: string,
  entries: string[],
): { stats: Map<string, fs.Stats>; accessible: string[] } {
  const stats = new Map<string, fs.Stats>();
  const accessible: string[] = [];

  for (const entry of entries) {
    try {
      stats.set(entry, fs.lstatSync(nodePath.join(dirPath, entry)));
      accessible.push(entry);
    } catch {
      // Skip entries that cannot be stat'd (e.g. permission denied).
    }
  }

  return { stats, accessible };
}

/**
 * Sorts directory entries according to the configured sort strategy.
 * Mutates `contents` in place — callers must not reuse the input array.
 * Assumes every entry in `contents` has a corresponding key in `stats`.
 */
function sortContentsInPlace(
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

/**
 * Filters out files (when `dirsOnly`) and reorders entries (when `dirsFirst` or `filesFirst`).
 */
function filterAndOrderContents(
  contents: string[],
  stats: Map<string, fs.Stats>,
  options: RequiredOptions,
): string[] {
  if (!options.dirsOnly && !options.dirsFirst && !options.filesFirst) {
    return contents;
  }

  const dirSet = new Set(
    contents.filter((entry) => stats.get(entry)!.isDirectory()),
  );
  const dirs = contents.filter((entry) => dirSet.has(entry));

  if (options.dirsOnly) {
    return dirs;
  }

  const files = contents.filter((entry) => !dirSet.has(entry));

  if (options.dirsFirst) {
    return dirs.concat(files);
  }

  // filesFirst
  return files.concat(dirs);
}

/**
 * Reads, filters, stats, sorts, and orders directory entries in a single pass.
 */
function getDirectoryContents(
  dirPath: string,
  options: RequiredOptions,
): { entries: string[]; stats: Map<string, fs.Stats>; openError: boolean } {
  let entries: string[];

  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return { entries: [], stats: new Map(), openError: true };
  }

  // Filter hidden files before stat'ing to avoid unnecessary syscalls.
  if (!options.allFiles) {
    entries = entries.filter((entry) => !isHiddenFile(entry));
  }

  const { stats, accessible } = statEntries(dirPath, entries);
  const sorted = sortContentsInPlace(accessible, stats, options);
  const filtered = filterAndOrderContents(sorted, stats, options);

  return { entries: filtered, stats, openError: false };
}

/**
 * Recursively computes the total size of a directory's contents (like `du`).
 * Populates `cache` with the cumulative size for each path.
 * Walks the entire directory tree independently of filtering options
 * (exclude, maxDepth, dirsOnly) so that reported sizes are accurate.
 */
function computeSizes(dirPath: string, cache: Map<string, number>): number {
  let size = 0;
  let entries: string[];

  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    cache.set(dirPath, 0);
    return 0;
  }

  for (const entry of entries) {
    const entryPath = nodePath.join(dirPath, entry);

    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(entryPath);
    } catch {
      continue;
    }

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

/**
 * Recursively builds a tree node for the given path.
 * Returns `null` if the entry is excluded or pruned.
 * Accepts an optional `cachedStat` to avoid redundant `lstatSync` calls.
 * When `du` is enabled, `sizeCache` overrides `stat.size` for directories
 * with their recursively computed totals; otherwise `stat.size` is used as-is.
 */
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

  if (matchesExcludePattern(path, options)) {
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

  if (isFile || currentDepth >= options.maxDepth) {
    return node;
  }

  const { entries, stats, openError } = getDirectoryContents(path, options);

  if (openError) {
    node.openError = true;
  }

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

/**
 * Entry point for building the tree. Pre-computes recursive sizes when `du` is enabled.
 * Assumes `path` is relative to `process.cwd()`.
 */
function buildTreeNode(
  path: string,
  options: RequiredOptions,
): TreeNode | null {
  const sizeCache = new Map<string, number>();

  if (options.du) {
    computeSizes(path, sizeCache);
  }

  const resolvedPath = nodePath.join(process.cwd(), path);
  const rootName = nodePath.basename(resolvedPath);

  return buildTree(rootName, path, 0, options, sizeCache);
}

/**
 * Merges user options with defaults, applies implicit flags (e.g. `du` implies `sizes`).
 */
function resolveOptions(options?: Options): RequiredOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    exclude: [...DEFAULT_EXCLUDE_PATTERNS, ...(options?.exclude ?? [])],
    ...(options?.du && { sizes: true }),
  };
}

/** Returns the directory tree as a formatted string. */
export function tree(path: string, options?: Options): string {
  const combinedOptions = resolveOptions(options);
  const root = buildTreeNode(path, combinedOptions);

  if (root == null) {
    return '';
  }

  return formatAsText(root, combinedOptions, path).join('\n');
}

/**
 * Returns the directory tree as a structured JSON entry, or `null` if the root is excluded.
 */
export function treeJson(
  path: string,
  options?: Options,
): TreeJsonEntry | null {
  const combinedOptions = resolveOptions(options);
  const root = buildTreeNode(path, combinedOptions);

  return root ? formatAsJson(root, combinedOptions) : null;
}
