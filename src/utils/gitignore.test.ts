import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createGitignoreFilter, findGitRoot } from './gitignore';

describe('findGitRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-gitroot-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('returns root from the repo directory', () => {
    execSync('git init', { cwd: tmpDir });
    expect(findGitRoot(tmpDir)).toBe(tmpDir);
  });

  test('returns root from a subdirectory', () => {
    execSync('git init', { cwd: tmpDir });
    const sub = path.join(tmpDir, 'a', 'b');
    fs.mkdirSync(sub, { recursive: true });
    expect(findGitRoot(sub)).toBe(tmpDir);
  });

  test('returns null when not in a git repo', () => {
    // tmpDir has no .git
    expect(findGitRoot(tmpDir)).toBeNull();
  });
});

describe('createGitignoreFilter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-gitfilter-'));
    execSync('git init', { cwd: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('ignores files matching root .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'ignored.txt\n*.log\n');
    const filter = createGitignoreFilter(tmpDir);

    expect(filter.ignores('ignored.txt', false)).toBe(true);
    expect(filter.ignores('app.log', false)).toBe(true);
    expect(filter.ignores('visible.txt', false)).toBe(false);
  });

  test('ignores directories matching directory-only patterns', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'build/\n');
    const filter = createGitignoreFilter(tmpDir);

    expect(filter.ignores('build', true)).toBe(true);
    expect(filter.ignores('build', false)).toBe(false); // file named "build" not matched
  });

  test('always ignores .git', () => {
    const filter = createGitignoreFilter(tmpDir);
    expect(filter.ignores('.git', true)).toBe(true);
  });

  test('handles nested .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '');
    const subDir = path.join(tmpDir, 'src');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, '.gitignore'), '*.tmp\n');

    const filter = createGitignoreFilter(tmpDir);
    filter.loadNestedGitignore(subDir);

    expect(filter.ignores('src/data.tmp', false)).toBe(true);
    expect(filter.ignores('src/data.ts', false)).toBe(false);
    // Root-level .tmp files are not ignored (only nested .gitignore applies)
    expect(filter.ignores('data.tmp', false)).toBe(false);
  });

  test('handles negation patterns', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '*.log\n!important.log\n',
    );
    const filter = createGitignoreFilter(tmpDir);

    expect(filter.ignores('app.log', false)).toBe(true);
    expect(filter.ignores('important.log', false)).toBe(false);
  });

  test('handles no .gitignore file', () => {
    const filter = createGitignoreFilter(tmpDir);
    // Only .git itself should be ignored
    expect(filter.ignores('.git', true)).toBe(true);
    expect(filter.ignores('anything.txt', false)).toBe(false);
  });
});
