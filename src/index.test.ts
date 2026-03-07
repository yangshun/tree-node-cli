import { execSync } from 'child_process';
import fs from 'fs';
import { isNotJunk } from 'junk';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { TreeJsonEntry } from './formats/json';
import { tree, treeJson } from './index';

function asDir(entry: TreeJsonEntry | null) {
  expect(entry).not.toBeNull();
  expect(entry!.type).toBe('directory');
  return entry as TreeJsonEntry & {
    type: 'directory';
    contents: TreeJsonEntry[];
  };
}

const PATH_TO_TEST = path.join(__dirname, '__fixtures__');
const dirs = fs.readdirSync(PATH_TO_TEST).filter(isNotJunk);

describe('tree', () => {
  test('default', () => {
    dirs.forEach((dir) => {
      expect(tree(path.join(PATH_TO_TEST, dir))).toMatchSnapshot();
    });
  });

  test('allFiles', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          allFiles: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('dirsFirst', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          dirsFirst: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('sizes', () => {
    // Use a controlled fixture to avoid filesystem-dependent directory sizes.
    const result = tree(path.join(PATH_TO_TEST, 'varied-sizes'), {
      sizes: true,
    });
    const lines = result.split('\n');
    // Every line should have a bracketed size prefix like [     10240].
    for (const line of lines) {
      expect(line).toMatch(/\[\s*\d+\]/);
    }
    // File sizes are deterministic (raw bytes).
    expect(result).toContain('[     10000] large.txt');
    expect(result).toContain('[      1000] medium.txt');
    expect(result).toContain('[       100] small.txt');
    expect(result).toContain('[         1] tiny.txt');
  });

  test('du', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          du: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('dirsOnly', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          dirsOnly: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('exclude', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          exclude: [/beta/],
        }),
      ).toMatchSnapshot();
    });
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          exclude: [/charlie/],
        }),
      ).toMatchSnapshot();
    });
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          exclude: [/beta/, /charlie/],
        }),
      ).toMatchSnapshot();
    });
  });

  test('maxDepth', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          maxDepth: 1,
        }),
      ).toMatchSnapshot();
    });
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          maxDepth: 2,
        }),
      ).toMatchSnapshot();
    });
  });

  test('reverse', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          reverse: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('trailingSlash', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          trailingSlash: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('lineAscii', () => {
    dirs.forEach((dir) => {
      const result = tree(path.join(PATH_TO_TEST, dir), {
        lineAscii: true,
      });
      expect(result).toMatchSnapshot();
    });
    dirs.forEach((dir) => {
      const result = tree(path.join(PATH_TO_TEST, dir), {
        lineAscii: false,
      });
      expect(result).toMatchSnapshot();
    });
  });

  test('maxDepth 0 shows only root', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      maxDepth: 0,
    });
    const lines = result.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('multi-level');
  });

  test('combined: dirsFirst + reverse', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      dirsFirst: true,
      reverse: true,
      maxDepth: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('combined: allFiles + dirsOnly', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      allFiles: true,
      dirsOnly: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('combined: trailingSlash + lineAscii + sizes', () => {
    const result = tree(path.join(PATH_TO_TEST, 'single-level'), {
      trailingSlash: true,
      lineAscii: true,
      sizes: true,
    });
    const lines = result.split('\n');
    // Root directory with trailing slash and bracketed size prefix.
    expect(lines[0]).toMatch(/^\[\s*\d+\] single-level\/$/);
    // File entry with ASCII branch and raw byte size.
    expect(result).toContain('[        13] alpha.txt');
    // Subdirectory with trailing slash.
    expect(lines[2]).toMatch(/`-- \[\s*\d+\] beta\/$/);
  });

  test('combined: exclude + allFiles', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      allFiles: true,
      exclude: [/\.gitkeep/],
    });
    expect(result).toMatchSnapshot();
  });

  test('prune', () => {
    // multi-level has charlie dir with .gitkeep (hidden) and visible files
    // Create a temp dir with an empty subdirectory to test pruning
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-prune-'));
    fs.mkdirSync(path.join(tmpDir, 'empty-dir'));
    fs.mkdirSync(path.join(tmpDir, 'populated-dir'));
    fs.writeFileSync(path.join(tmpDir, 'populated-dir', 'file.txt'), '');
    fs.writeFileSync(path.join(tmpDir, 'root-file.txt'), '');

    const withoutPrune = tree(tmpDir);
    expect(withoutPrune).toContain('empty-dir');
    expect(withoutPrune).toContain('populated-dir');

    const withPrune = tree(tmpDir, { prune: true });
    expect(withPrune).not.toContain('empty-dir');
    expect(withPrune).toContain('populated-dir');
    expect(withPrune).toContain('root-file.txt');

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('prune removes nested empty dirs', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-prune-'));
    fs.mkdirSync(
      path.join(tmpDir, 'empty-parent', 'empty-child', 'empty-leaf'),
      { recursive: true },
    );
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), '');

    const result = tree(tmpDir, { prune: true });
    expect(result).not.toContain('empty-parent');
    expect(result).not.toContain('empty-child');
    expect(result).not.toContain('empty-leaf');
    expect(result).toContain('file.txt');

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('json', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-level'), { maxDepth: 1 }),
    );
    expect(result.name).toBe('multi-level');
    const names = result.contents.map((c) => c.name);
    expect(names).toContain('alpha.txt');
    expect(names).toContain('beta');
  });

  test('json with sizes', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'single-file'), { sizes: true }),
    );
    expect(result.size).toBeDefined();
    expect(typeof result.contents[0].size).toBe('number');
  });

  test('json with permissions', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-level'), { maxDepth: 1 }),
    );
    // Without permissions, mode should not be present
    expect(result.mode).toBeUndefined();

    const withPerms = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-level'), {
        permissions: true,
        maxDepth: 1,
      }),
    );
    expect(withPerms.mode).toMatch(/\[d[rwx-]{9}\]/);
    const file = withPerms.contents.find((c) => c.name === 'alpha.txt');
    expect(file!.mode).toMatch(/\[-[rwx-]{9}\]/);
  });

  test('json with date', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'single-file'), { date: true }),
    );
    expect(result.time).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    expect(result.contents[0].time).toMatch(
      /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,
    );
  });

  test('json with exclude', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-files'), { exclude: [/beta/] }),
    );
    const names = result.contents.map((c) => c.name);
    expect(names).toContain('alpha.txt');
    expect(names).not.toContain('beta.txt');
    expect(names).toContain('charlie.txt');
  });

  test('json with dirsOnly', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-level'), { dirsOnly: true }),
    );
    const names = result.contents.map((c) => c.name);
    expect(names).toContain('beta');
    expect(names).toContain('charlie');
    expect(names).not.toContain('alpha.txt');
    expect(names).not.toContain('delta.txt');
  });

  test('json with dirsFirst', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-level'), {
        dirsFirst: true,
        maxDepth: 1,
      }),
    );
    const { contents } = result;
    const firstFileIdx = contents.findIndex((c) => c.type === 'file');
    const lastDirIdx =
      contents.length -
      1 -
      [...contents].reverse().findIndex((c) => c.type === 'directory');
    expect(lastDirIdx).toBeLessThan(firstFileIdx);
  });

  test('json with filesFirst', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-level'), {
        filesFirst: true,
        maxDepth: 1,
      }),
    );
    const { contents } = result;
    const firstDirIdx = contents.findIndex((c) => c.type === 'directory');
    const lastFileIdx =
      contents.length -
      1 -
      [...contents].reverse().findIndex((c) => c.type === 'file');
    expect(lastFileIdx).toBeLessThan(firstDirIdx);
  });

  test('json with reverse', () => {
    const normal = asDir(treeJson(path.join(PATH_TO_TEST, 'multi-files')));
    const reversed = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-files'), { reverse: true }),
    );
    const normalNames = normal.contents.map((c) => c.name);
    const reversedNames = reversed.contents.map((c) => c.name);
    expect(reversedNames).toEqual([...normalNames].reverse());
  });

  test('json with sortBy version', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'numbered-files'), {
        sortBy: 'version',
      }),
    );
    const names = result.contents.map((c) => c.name);
    expect(names).toEqual([
      'file1.txt',
      'file2.txt',
      'file3.txt',
      'file10.txt',
      'file20.txt',
    ]);
  });

  test('json with sortBy mtime', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-files'), { sortBy: 'mtime' }),
    );
    expect(result.contents.length).toBe(3);
  });

  test('json with sortBy ctime', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-files'), { sortBy: 'ctime' }),
    );
    expect(result.contents.length).toBe(3);
  });

  test('json with sortBy size', () => {
    const result = asDir(
      treeJson(path.join(PATH_TO_TEST, 'multi-files'), { sortBy: 'size' }),
    );
    expect(result.contents.length).toBe(3);
  });

  test('json with prune', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-json-prune-'));
    fs.mkdirSync(path.join(tmpDir, 'empty-dir'));
    fs.mkdirSync(path.join(tmpDir, 'populated-dir'));
    fs.writeFileSync(path.join(tmpDir, 'populated-dir', 'file.txt'), '');

    const result = asDir(treeJson(tmpDir, { prune: true }));
    const names = result.contents.map((c) => c.name);
    expect(names).not.toContain('empty-dir');
    expect(names).toContain('populated-dir');

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('quote', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      quote: true,
      maxDepth: 1,
    });
    expect(result).toContain('"multi-level"');
    expect(result).toContain('"alpha.txt"');
    expect(result).toContain('"beta"');
  });

  test('date', () => {
    const result = tree(path.join(PATH_TO_TEST, 'single-file'), {
      date: true,
    });
    // Should contain a date/time pattern like [2025-03-07 15:23:00]
    expect(result).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
  });

  test('permissions', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      permissions: true,
      maxDepth: 1,
    });
    // Root dir should show directory permissions
    expect(result).toMatch(/\[d[rwx-]{9}\] multi-level/);
    // Files should show file permissions
    expect(result).toMatch(/\[-[rwx-]{9}\] alpha\.txt/);
  });

  test('noIndent', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      noIndent: true,
      maxDepth: 1,
    });
    const lines = result.split('\n');
    for (const line of lines) {
      expect(line).not.toMatch(/[├└│|`]/);
      expect(line).not.toMatch(/^\s/);
    }
    expect(result).toContain('alpha.txt');
    expect(result).toContain('beta');
  });

  test('fullPath', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      fullPath: true,
    });
    expect(result).toContain('multi-level/alpha.txt');
    expect(result).toContain('multi-level/beta/beta.txt');
    expect(result).toContain('multi-level/beta/alpha/alpha.txt');
  });

  test('filesFirst', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      filesFirst: true,
      maxDepth: 1,
    });
    const lines = result.split('\n');
    const firstDirIndex = Math.min(
      lines.findIndex((l) => /[├└]── beta/.test(l)),
      lines.findIndex((l) => /[├└]── charlie/.test(l)),
    );
    const lastFileIndex = Math.max(
      lines.findIndex((l) => l.includes('alpha.txt')),
      lines.findIndex((l) => l.includes('delta.txt')),
    );
    expect(lastFileIndex).toBeLessThan(firstDirIndex);
  });

  test('unsorted', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-files'), {
      unsorted: true,
    });
    expect(result).toContain('alpha.txt');
    expect(result).toContain('beta.txt');
    expect(result).toContain('charlie.txt');
  });

  test('sortBy version', () => {
    const result = tree(path.join(PATH_TO_TEST, 'numbered-files'), {
      sortBy: 'version',
    });
    const lines = result.split('\n');
    const fileLines = lines.filter((l) => l.includes('.txt'));
    expect(fileLines[0]).toContain('file1.txt');
    expect(fileLines[1]).toContain('file2.txt');
    expect(fileLines[2]).toContain('file3.txt');
    expect(fileLines[3]).toContain('file10.txt');
    expect(fileLines[4]).toContain('file20.txt');
  });

  test('sortBy mtime', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-files'), {
      sortBy: 'mtime',
    });
    expect(result).toContain('alpha.txt');
    expect(result).toContain('beta.txt');
    expect(result).toContain('charlie.txt');
  });

  test('sortBy ctime', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-files'), {
      sortBy: 'ctime',
    });
    expect(result).toContain('alpha.txt');
    expect(result).toContain('beta.txt');
    expect(result).toContain('charlie.txt');
  });

  test('sortBy size', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-files'), {
      sortBy: 'size',
    });
    expect(result).toContain('alpha.txt');
    expect(result).toContain('beta.txt');
    expect(result).toContain('charlie.txt');
  });

  test('combined: filesFirst + reverse', () => {
    const result = tree(path.join(PATH_TO_TEST, 'multi-level'), {
      filesFirst: true,
      reverse: true,
      maxDepth: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('combined: du + exclude', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-du-excl-'));
    fs.mkdirSync(path.join(tmpDir, 'included'));
    fs.writeFileSync(path.join(tmpDir, 'included', 'a.txt'), 'hello');
    fs.mkdirSync(path.join(tmpDir, 'excluded'));
    fs.writeFileSync(
      path.join(tmpDir, 'excluded', 'big.txt'),
      'x'.repeat(10000),
    );
    fs.writeFileSync(path.join(tmpDir, 'root.txt'), 'root');

    const result = tree(tmpDir, { du: true, exclude: [/excluded/] });
    expect(result).not.toContain('excluded');
    expect(result).toContain('included');
    expect(result).toContain('root.txt');

    // Directory sizes should still reflect real filesystem size (including excluded contents)
    const jsonResult = asDir(
      treeJson(tmpDir, { du: true, exclude: [/excluded/] }),
    );
    expect(jsonResult.size).toBeDefined();
    // Root size should include the excluded directory's contents
    expect(jsonResult.size!).toBeGreaterThan(10000);

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('combined: du + maxDepth', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-du-depth-'));
    fs.mkdirSync(path.join(tmpDir, 'level1', 'level2'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'level1', 'level2', 'deep.txt'),
      'x'.repeat(5000),
    );
    fs.writeFileSync(path.join(tmpDir, 'level1', 'shallow.txt'), 'hi');

    const result = tree(tmpDir, { du: true, maxDepth: 1 });
    // deep.txt should not be shown (beyond maxDepth)
    expect(result).not.toContain('deep.txt');
    expect(result).toContain('level1');

    // But directory size should still include deep files
    const jsonResult = asDir(treeJson(tmpDir, { du: true, maxDepth: 1 }));
    const level1 = jsonResult.contents.find((c) => c.name === 'level1');
    expect(level1).toBeDefined();
    expect(level1!.size).toBeGreaterThan(5000);

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('combined: du + dirsOnly', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-du-dirs-'));
    fs.mkdirSync(path.join(tmpDir, 'subdir'));
    fs.writeFileSync(path.join(tmpDir, 'subdir', 'file.txt'), 'x'.repeat(3000));
    fs.writeFileSync(path.join(tmpDir, 'root.txt'), 'root');

    const result = tree(tmpDir, { du: true, dirsOnly: true });
    expect(result).not.toContain('file.txt');
    expect(result).not.toContain('root.txt');
    expect(result).toContain('subdir');

    // Directory sizes should include file contents even though files aren't displayed
    const jsonResult = asDir(treeJson(tmpDir, { du: true, dirsOnly: true }));
    const subdir = jsonResult.contents.find((c) => c.name === 'subdir');
    expect(subdir).toBeDefined();
    expect(subdir!.size).toBeGreaterThanOrEqual(3000);

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('du implies sizes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-du-implies-'));
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');

    // du without sizes should still show sizes
    const result = tree(tmpDir, { du: true });
    expect(result).toMatch(/\[\s*\d+\]/);

    const jsonResult = asDir(treeJson(tmpDir, { du: true }));
    expect(jsonResult.size).toBeDefined();

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('sizes uses stat.size (not recursive)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-sizes-stat-'));
    fs.mkdirSync(path.join(tmpDir, 'subdir'));
    fs.writeFileSync(path.join(tmpDir, 'subdir', 'big.txt'), 'x'.repeat(10000));

    // With sizes (not du), directory size should be the inode size, not recursive sum
    const jsonResult = asDir(treeJson(tmpDir, { sizes: true }));
    const subdir = jsonResult.contents.find((c) => c.name === 'subdir');
    expect(subdir).toBeDefined();
    // Directory stat.size is typically small (64-4096 bytes), not 10000+
    expect(subdir!.size).toBeLessThan(10000);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('tree error handling', () => {
  test('throws on non-existent path', () => {
    expect(() => tree('/non/existent/path')).toThrow();
  });

  test('returns just the filename for a file path', () => {
    const result = tree(path.join(PATH_TO_TEST, 'single-file', 'alpha.txt'));
    const lines = result.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('alpha.txt');
  });

  test('shows [error opening dir] for inaccessible directories', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-perm-'));
    const forbidden = path.join(tmpDir, 'forbidden');
    fs.mkdirSync(forbidden);
    fs.writeFileSync(path.join(tmpDir, 'ok.txt'), 'hello');
    // Remove all permissions from the directory.
    fs.chmodSync(forbidden, 0o000);

    const result = tree(tmpDir);
    expect(result).toContain('forbidden [error opening dir]');
    expect(result).toContain('ok.txt');

    // Restore permissions for cleanup.
    fs.chmodSync(forbidden, 0o755);
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('json includes error for inaccessible directories', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-perm-'));
    const forbidden = path.join(tmpDir, 'forbidden');
    fs.mkdirSync(forbidden);
    fs.chmodSync(forbidden, 0o000);

    const result = asDir(treeJson(tmpDir));
    const entry = result.contents.find((c) => c.name === 'forbidden');
    expect(entry).toBeDefined();
    expect((entry as any).error).toBe('error opening dir');

    fs.chmodSync(forbidden, 0o755);
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('du handles inaccessible directories gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-perm-'));
    const forbidden = path.join(tmpDir, 'forbidden');
    fs.mkdirSync(forbidden);
    fs.writeFileSync(path.join(tmpDir, 'ok.txt'), 'hello');
    fs.chmodSync(forbidden, 0o000);

    const result = tree(tmpDir, { du: true });
    expect(result).toContain('forbidden [error opening dir]');
    expect(result).toContain('ok.txt');

    fs.chmodSync(forbidden, 0o755);
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('tree with symlinks', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-test-'));
    fs.writeFileSync(path.join(tmpDir, 'real-file.txt'), 'hello');
    fs.mkdirSync(path.join(tmpDir, 'real-dir'));
    fs.writeFileSync(path.join(tmpDir, 'real-dir', 'nested.txt'), 'world');
    fs.symlinkSync(
      path.join(tmpDir, 'real-file.txt'),
      path.join(tmpDir, 'link-to-file.txt'),
    );
    fs.symlinkSync(
      path.join(tmpDir, 'real-dir'),
      path.join(tmpDir, 'link-to-dir'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('lists symlinks but does not follow them into directories', () => {
    const result = tree(tmpDir);
    expect(result).toContain('link-to-file.txt');
    expect(result).toContain('link-to-dir');
    // The symlinked dir should appear but its contents should not,
    // because lstatSync treats it as a non-directory (symlink).
    const lines = result.split('\n');
    const linkDirLine = lines.find((l) => l.includes('link-to-dir'));
    expect(linkDirLine).toBeDefined();
    // nested.txt should only appear once (under real-dir, not under link-to-dir)
    const nestedOccurrences = lines.filter((l) => l.includes('nested.txt'));
    expect(nestedOccurrences).toHaveLength(1);
  });

  test('symlinks are excluded by dirsOnly', () => {
    const result = tree(tmpDir, { dirsOnly: true });
    // Symlinks are treated as files by lstatSync, so they should be excluded
    expect(result).not.toContain('link-to-file.txt');
    expect(result).not.toContain('link-to-dir');
    expect(result).toContain('real-dir');
  });
});

describe('tree with special characters in filenames', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-test-'));
    fs.writeFileSync(path.join(tmpDir, 'file with spaces.txt'), '');
    fs.writeFileSync(path.join(tmpDir, 'file-with-dashes.txt'), '');
    fs.writeFileSync(path.join(tmpDir, "file'with'quotes.txt"), '');
    fs.writeFileSync(path.join(tmpDir, 'file(with)parens.txt'), '');
    fs.mkdirSync(path.join(tmpDir, 'dir with spaces'));
    fs.writeFileSync(
      path.join(tmpDir, 'dir with spaces', 'inner.txt'),
      'content',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('handles filenames with special characters', () => {
    const result = tree(tmpDir);
    expect(result).toContain('file with spaces.txt');
    expect(result).toContain('file-with-dashes.txt');
    expect(result).toContain("file'with'quotes.txt");
    expect(result).toContain('file(with)parens.txt');
    expect(result).toContain('dir with spaces');
    expect(result).toContain('inner.txt');
  });

  test('special characters work with exclude patterns', () => {
    const result = tree(tmpDir, { exclude: [/spaces/] });
    expect(result).not.toContain('file with spaces.txt');
    expect(result).not.toContain('dir with spaces');
    expect(result).toContain('file-with-dashes.txt');
  });
});

describe('tree with gitignore', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-gitignore-'));
    execSync('git init', { cwd: tmpDir });
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      'ignored-dir/\nignored-file.txt\n',
    );
    fs.mkdirSync(path.join(tmpDir, 'ignored-dir'));
    fs.writeFileSync(path.join(tmpDir, 'ignored-dir', 'file.txt'), '');
    fs.writeFileSync(path.join(tmpDir, 'ignored-file.txt'), '');
    fs.writeFileSync(path.join(tmpDir, 'visible-file.txt'), '');
    fs.mkdirSync(path.join(tmpDir, 'visible-dir'));
    fs.writeFileSync(path.join(tmpDir, 'visible-dir', 'nested.txt'), '');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('excludes gitignored files by default', () => {
    const result = tree(tmpDir);
    expect(result).not.toContain('ignored-dir');
    expect(result).not.toContain('ignored-file.txt');
    expect(result).toContain('visible-file.txt');
    expect(result).toContain('visible-dir');
  });

  test('shows gitignored files when gitignore is false', () => {
    const result = tree(tmpDir, { gitignore: false });
    expect(result).toContain('ignored-dir');
    expect(result).toContain('ignored-file.txt');
    expect(result).toContain('visible-file.txt');
  });

  test('works with nested .gitignore', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'visible-dir', '.gitignore'),
      'nested.txt\n',
    );
    const result = tree(tmpDir, { allFiles: true });
    expect(result).not.toContain('nested.txt');
    expect(result).toContain('visible-dir');
  });

  test('gitignore has no effect outside git repo', () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-nogit-'));
    fs.writeFileSync(path.join(nonGitDir, '.gitignore'), '*.txt\n');
    fs.writeFileSync(path.join(nonGitDir, 'file.txt'), '');

    const result = tree(nonGitDir);
    expect(result).toContain('file.txt');

    fs.rmSync(nonGitDir, { recursive: true });
  });

  test('gitignore works together with exclude option', () => {
    const result = tree(tmpDir, { exclude: [/visible-dir/] });
    expect(result).not.toContain('ignored-dir');
    expect(result).not.toContain('ignored-file.txt');
    expect(result).not.toContain('visible-dir');
    expect(result).toContain('visible-file.txt');
  });

  test('gitignore works with treeJson', () => {
    const result = treeJson(tmpDir);
    const dir = asDir(result);
    const names = dir.contents.map((c) => c.name);
    expect(names).not.toContain('ignored-dir');
    expect(names).not.toContain('ignored-file.txt');
    expect(names).toContain('visible-file.txt');
    expect(names).toContain('visible-dir');
  });
});
