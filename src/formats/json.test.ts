import { describe, expect, test } from 'vitest';

import type { RequiredOptions, TreeNode } from '../index';
import { formatAsJson } from './json';

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

function opts(overrides: Partial<RequiredOptions> = {}): RequiredOptions {
  return { ...DEFAULT_OPTIONS, ...overrides };
}

const MTIME = new Date('2025-01-15T10:30:00Z');

function makeFile(name: string, overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    name,
    path: name,
    isDirectory: false,
    mode: 0o644,
    mtime: MTIME,
    size: 1024,
    children: [],
    ...overrides,
  };
}

function makeDir(
  name: string,
  children: TreeNode[],
  overrides: Partial<TreeNode> = {},
): TreeNode {
  return {
    name,
    path: name,
    isDirectory: true,
    mode: 0o755,
    mtime: MTIME,
    size: 4096,
    children,
    ...overrides,
  };
}

describe('formatAsJson', () => {
  test('formats a file node', () => {
    const node = makeFile('hello.txt');
    expect(formatAsJson(node, opts())).toEqual({
      type: 'file',
      name: 'hello.txt',
    });
  });

  test('formats a directory with children', () => {
    const node = makeDir('src', [
      makeFile('a.ts'),
      makeFile('b.ts'),
    ]);
    expect(formatAsJson(node, opts())).toEqual({
      type: 'directory',
      name: 'src',
      contents: [
        { type: 'file', name: 'a.ts' },
        { type: 'file', name: 'b.ts' },
      ],
    });
  });

  test('formats empty directory', () => {
    const node = makeDir('empty', []);
    expect(formatAsJson(node, opts())).toEqual({
      type: 'directory',
      name: 'empty',
      contents: [],
    });
  });

  test('includes size when sizes option is enabled', () => {
    const node = makeFile('a.ts', { size: 2048 });
    const result = formatAsJson(node, opts({ sizes: true }));
    expect(result.size).toBe(2048);
  });

  test('includes mode when permissions option is enabled', () => {
    const node = makeFile('a.ts', { mode: 0o644 });
    const result = formatAsJson(node, opts({ permissions: true }));
    expect(result.mode).toBe('[-rw-r--r--]');
  });

  test('includes directory mode when permissions option is enabled', () => {
    const node = makeDir('src', []);
    const result = formatAsJson(node, opts({ permissions: true }));
    expect(result.mode).toBe('[drwxr-xr-x]');
  });

  test('includes time when date option is enabled', () => {
    const node = makeFile('a.ts');
    const result = formatAsJson(node, opts({ date: true }));
    expect(result.time).toBeDefined();
    expect(typeof result.time).toBe('string');
  });

  test('does not include optional fields by default', () => {
    const node = makeFile('a.ts');
    const result = formatAsJson(node, opts());
    expect(result.size).toBeUndefined();
    expect(result.mode).toBeUndefined();
    expect(result.time).toBeUndefined();
  });

  test('file nodes do not have contents', () => {
    const node = makeFile('a.ts');
    const result = formatAsJson(node, opts());
    expect(result.contents).toBeUndefined();
  });

  test('nested directories', () => {
    const node = makeDir('root', [
      makeDir('sub', [makeFile('file.txt')]),
    ]);
    const result = formatAsJson(node, opts());
    expect(result.contents![0].contents![0]).toEqual({
      type: 'file',
      name: 'file.txt',
    });
  });
});
