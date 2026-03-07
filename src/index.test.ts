import fs from 'fs';
import { isNotJunk } from 'junk';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import tree from './index';

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
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          sizes: true,
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
    expect(result).toMatchSnapshot();
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
    fs.mkdirSync(path.join(tmpDir, 'empty-parent', 'empty-child', 'empty-leaf'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), '');

    const result = tree(tmpDir, { prune: true });
    expect(result).not.toContain('empty-parent');
    expect(result).not.toContain('empty-child');
    expect(result).not.toContain('empty-leaf');
    expect(result).toContain('file.txt');

    fs.rmSync(tmpDir, { recursive: true });
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
