import { describe, expect, test } from 'vitest';

import type { RequiredOptions, TreeNode } from '../index';
import { formatAsText } from './text';

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

describe('formatAsText', () => {
  test('single file node', () => {
    const node = makeFile('hello.txt');
    expect(formatAsText(node, opts(), '.')).toEqual(['hello.txt']);
  });

  test('directory with children', () => {
    const node = makeDir('src', [
      makeFile('a.ts', { path: 'src/a.ts' }),
      makeFile('b.ts', { path: 'src/b.ts' }),
    ]);
    expect(formatAsText(node, opts(), '.')).toEqual([
      'src',
      '├── a.ts',
      '└── b.ts',
    ]);
  });

  test('nested directories', () => {
    const node = makeDir('root', [
      makeDir('sub', [makeFile('file.txt', { path: 'root/sub/file.txt' })], {
        path: 'root/sub',
      }),
    ]);
    expect(formatAsText(node, opts(), '.')).toEqual([
      'root',
      '└── sub',
      '    └── file.txt',
    ]);
  });

  test('lineAscii uses ASCII symbols', () => {
    const node = makeDir('src', [
      makeFile('a.ts', { path: 'src/a.ts' }),
      makeFile('b.ts', { path: 'src/b.ts' }),
    ]);
    expect(formatAsText(node, opts({ lineAscii: true }), '.')).toEqual([
      'src',
      '|-- a.ts',
      '`-- b.ts',
    ]);
  });

  test('noIndent omits tree graphics', () => {
    const node = makeDir('src', [
      makeFile('a.ts', { path: 'src/a.ts' }),
      makeFile('b.ts', { path: 'src/b.ts' }),
    ]);
    expect(formatAsText(node, opts({ noIndent: true }), '.')).toEqual([
      'src',
      'a.ts',
      'b.ts',
    ]);
  });

  test('trailingSlash appends / to directories', () => {
    const node = makeDir('src', [
      makeDir('lib', [], { path: 'src/lib' }),
      makeFile('index.ts', { path: 'src/index.ts' }),
    ]);
    expect(formatAsText(node, opts({ trailingSlash: true }), '.')).toEqual([
      'src/',
      '├── lib/',
      '└── index.ts',
    ]);
  });

  test('quote wraps names in double quotes', () => {
    const node = makeDir('src', [makeFile('a.ts', { path: 'src/a.ts' })]);
    expect(formatAsText(node, opts({ quote: true }), '.')).toEqual([
      '"src"',
      '└── "a.ts"',
    ]);
  });

  test('permissions shows mode string', () => {
    const node = makeDir('src', [
      makeFile('a.ts', { path: 'src/a.ts', mode: 0o644 }),
    ]);
    const lines = formatAsText(node, opts({ permissions: true }), '.');
    expect(lines[0]).toBe('[drwxr-xr-x] src');
    expect(lines[1]).toBe('└── [-rw-r--r--] a.ts');
  });

  test('sizes shows file size', () => {
    const node = makeFile('a.ts', { size: 2048 });
    const lines = formatAsText(node, opts({ sizes: true }), '.');
    expect(lines[0]).toContain('2.05kB');
  });

  test('fullPath shows relative path', () => {
    const node = makeDir('src', [makeFile('a.ts', { path: 'src/a.ts' })]);
    const lines = formatAsText(node, opts({ fullPath: true }), 'src');
    expect(lines[1]).toBe('└── src/a.ts');
  });

  test('date shows modification time', () => {
    const node = makeFile('a.ts');
    const lines = formatAsText(node, opts({ date: true }), '.');
    expect(lines[0]).toMatch(/^\[.+\] a\.ts$/);
  });

  test('openError shows [error opening dir]', () => {
    const node = makeDir('root', [
      makeDir('forbidden', [], { path: 'root/forbidden', openError: true }),
      makeFile('ok.txt', { path: 'root/ok.txt' }),
    ]);
    const lines = formatAsText(node, opts(), '.');
    expect(lines).toEqual([
      'root',
      '├── forbidden [error opening dir]',
      '└── ok.txt',
    ]);
  });

  test('openError with trailingSlash', () => {
    const node = makeDir('root', [
      makeDir('forbidden', [], { path: 'root/forbidden', openError: true }),
    ]);
    const lines = formatAsText(node, opts({ trailingSlash: true }), '.');
    expect(lines).toEqual([
      'root/',
      '└── forbidden/ [error opening dir]',
    ]);
  });

  test('vertical line for non-last siblings', () => {
    const node = makeDir('root', [
      makeDir('dir1', [makeFile('file.txt', { path: 'root/dir1/file.txt' })], {
        path: 'root/dir1',
      }),
      makeFile('other.txt', { path: 'root/other.txt' }),
    ]);
    const lines = formatAsText(node, opts(), '.');
    expect(lines).toEqual([
      'root',
      '├── dir1',
      '│   └── file.txt',
      '└── other.txt',
    ]);
  });
});
