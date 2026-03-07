import { execFile, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const TSX_PATH = path.resolve(__dirname, '../node_modules/.bin/tsx');
const CLI_PATH = path.resolve(__dirname, 'cli.ts');
const FIXTURES_PATH = path.join(__dirname, '__fixtures__');

function run(
  args: string[] = [],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(TSX_PATH, [CLI_PATH, ...args], (error, stdout, stderr) => {
      resolve({
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        exitCode: error ? 1 : 0,
      });
    });
  });
}

describe('cli', () => {
  test('displays version with --version', async () => {
    const { stdout, exitCode } = await run(['--version']);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    expect(exitCode).toBe(0);
  });

  test('displays help with --help', async () => {
    const { stdout, exitCode } = await run(['--help']);
    expect(stdout).toContain('--all-files');
    expect(stdout).toContain('--exclude');
    expect(exitCode).toBe(0);
  });

  test('lists directory with path argument', async () => {
    const { stdout } = await run([path.join(FIXTURES_PATH, 'multi-files')]);
    expect(stdout).toContain('alpha.txt');
    expect(stdout).toContain('beta.txt');
    expect(stdout).toContain('charlie.txt');
  });

  test('respects -L max depth', async () => {
    const { stdout } = await run([
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    expect(stdout).toContain('alpha.txt');
    expect(stdout).toContain('beta');
    // Should not show nested files at depth 2
    expect(stdout).not.toContain('beta.txt');
  });

  test('respects -I exclude pattern', async () => {
    const { stdout } = await run([
      '-I',
      'beta',
      path.join(FIXTURES_PATH, 'multi-files'),
    ]);
    expect(stdout).toContain('alpha.txt');
    expect(stdout).not.toContain('beta.txt');
    expect(stdout).toContain('charlie.txt');
  });

  test('respects -d dirs only', async () => {
    const { stdout } = await run([
      '-d',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    expect(stdout).toContain('beta');
    expect(stdout).toContain('charlie');
    expect(stdout).not.toContain('alpha.txt');
    expect(stdout).not.toContain('delta.txt');
  });

  test('respects -r reverse', async () => {
    const { stdout } = await run([
      '-r',
      path.join(FIXTURES_PATH, 'multi-files'),
    ]);
    const lines = stdout.split('\n');
    const fileLines = lines.filter((l) => l.includes('.txt'));
    expect(fileLines[0]).toContain('charlie.txt');
    expect(fileLines[1]).toContain('beta.txt');
    expect(fileLines[2]).toContain('alpha.txt');
  });

  test('respects -F trailing slash', async () => {
    const { stdout } = await run([
      '-F',
      path.join(FIXTURES_PATH, 'single-level'),
    ]);
    expect(stdout).toContain('beta/');
  });

  test('respects -S line ascii', async () => {
    const { stdout } = await run([
      '-S',
      path.join(FIXTURES_PATH, 'multi-files'),
    ]);
    expect(stdout).toContain('|--');
    expect(stdout).toContain('`--');
    expect(stdout).not.toContain('├');
    expect(stdout).not.toContain('└');
  });

  test('respects -J json output', async () => {
    const { stdout } = await run([
      '-J',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe('directory');
    expect(parsed[0].name).toBe('multi-level');
    expect(parsed[0].contents).toBeDefined();
  });

  test('respects -Q quote', async () => {
    const { stdout } = await run([
      '-Q',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    expect(stdout).toContain('"multi-level"');
    expect(stdout).toContain('"alpha.txt"');
    expect(stdout).toContain('"beta"');
  });

  test('respects -D date', async () => {
    const { stdout } = await run([
      '-D',
      path.join(FIXTURES_PATH, 'single-file'),
    ]);
    expect(stdout).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
  });

  test('respects -p permissions', async () => {
    const { stdout } = await run([
      '-p',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    expect(stdout).toMatch(/\[d[rwx-]{9}\]/);
    expect(stdout).toMatch(/\[-[rwx-]{9}\]/);
  });

  test('respects -i no indent', async () => {
    const { stdout } = await run([
      '-i',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    const lines = stdout.split('\n');
    for (const line of lines) {
      expect(line).not.toMatch(/[├└│|`]/);
      expect(line).not.toMatch(/^\s/);
    }
    expect(stdout).toContain('alpha.txt');
    expect(stdout).toContain('beta');
  });

  test('respects --prune', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-prune-'));
    fs.mkdirSync(path.join(tmpDir, 'empty-dir'));
    fs.mkdirSync(path.join(tmpDir, 'populated-dir'));
    fs.writeFileSync(path.join(tmpDir, 'populated-dir', 'file.txt'), '');

    const { stdout } = await run(['--prune', tmpDir]);
    expect(stdout).not.toContain('empty-dir');
    expect(stdout).toContain('populated-dir');

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('respects -f full path', async () => {
    const { stdout } = await run([
      '-f',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    expect(stdout).toContain('multi-level/alpha.txt');
    expect(stdout).toContain('multi-level/beta/beta.txt');
  });

  test('respects --dirs-first', async () => {
    const { stdout } = await run([
      '--dirs-first',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    const lines = stdout.split('\n');
    const lastDirIndex = Math.max(
      lines.findIndex((l) => /[├└]── beta/.test(l)),
      lines.findIndex((l) => /[├└]── charlie/.test(l)),
    );
    const firstFileIndex = lines.findIndex((l) => l.includes('alpha.txt'));
    expect(lastDirIndex).toBeLessThan(firstFileIndex);
  });

  test('respects --dirsfirst alias', async () => {
    const { stdout: withDash } = await run([
      '--dirs-first',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    const { stdout: withoutDash } = await run([
      '--dirsfirst',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    expect(withoutDash).toBe(withDash);
  });

  test('respects -s sizes', async () => {
    const { stdout: withoutSizes } = await run([
      path.join(FIXTURES_PATH, 'single-file'),
    ]);
    const { stdout: withSizes } = await run([
      '-s',
      path.join(FIXTURES_PATH, 'single-file'),
    ]);
    // Without sizes, just the filename
    expect(withoutSizes).toContain('alpha.txt');
    expect(withoutSizes).not.toMatch(/\[\s*\d+\]/);
    // With sizes, each line should have a bracketed size prefix like [     1024]
    const lines = withSizes.split('\n');
    for (const line of lines) {
      expect(line).toMatch(/\[\s*\d+\]/);
    }
  });

  test('respects --du', async () => {
    const { stdout } = await run([
      '--du',
      path.join(FIXTURES_PATH, 'single-file'),
    ]);
    // --du implies -s, so sizes should be shown
    const lines = stdout.split('\n');
    for (const line of lines) {
      expect(line).toMatch(/\[\s*\d+\]/);
    }
  });

  test('respects -v version sort', async () => {
    const { stdout } = await run([
      '-v',
      path.join(FIXTURES_PATH, 'numbered-files'),
    ]);
    const lines = stdout.split('\n');
    const fileLines = lines.filter((l) => l.includes('.txt'));
    expect(fileLines[0]).toContain('file1.txt');
    expect(fileLines[1]).toContain('file2.txt');
    expect(fileLines[2]).toContain('file3.txt');
    expect(fileLines[3]).toContain('file10.txt');
    expect(fileLines[4]).toContain('file20.txt');
  });

  test('respects --files-first', async () => {
    const { stdout } = await run([
      '--files-first',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    const lines = stdout.split('\n');
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

  test('respects --filesfirst alias', async () => {
    const { stdout: withDash } = await run([
      '--files-first',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    const { stdout: withoutDash } = await run([
      '--filesfirst',
      '-L',
      '1',
      path.join(FIXTURES_PATH, 'multi-level'),
    ]);
    expect(withoutDash).toBe(withDash);
  });

  test('respects -U unsorted', async () => {
    const { stdout, exitCode } = await run([
      '-U',
      path.join(FIXTURES_PATH, 'multi-files'),
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('alpha.txt');
    expect(stdout).toContain('beta.txt');
    expect(stdout).toContain('charlie.txt');
  });

  test('respects -t sort by mtime', async () => {
    const { stdout, exitCode } = await run([
      '-t',
      path.join(FIXTURES_PATH, 'multi-files'),
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('alpha.txt');
    expect(stdout).toContain('beta.txt');
    expect(stdout).toContain('charlie.txt');
  });

  test('respects -c sort by ctime', async () => {
    const { stdout, exitCode } = await run([
      '-c',
      path.join(FIXTURES_PATH, 'multi-files'),
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('alpha.txt');
    expect(stdout).toContain('beta.txt');
    expect(stdout).toContain('charlie.txt');
  });

  test('respects --sort version', async () => {
    const { stdout } = await run([
      '--sort',
      'version',
      path.join(FIXTURES_PATH, 'numbered-files'),
    ]);
    const lines = stdout.split('\n');
    const fileLines = lines.filter((l) => l.includes('.txt'));
    expect(fileLines[0]).toContain('file1.txt');
    expect(fileLines[1]).toContain('file2.txt');
    expect(fileLines[2]).toContain('file3.txt');
    expect(fileLines[3]).toContain('file10.txt');
    expect(fileLines[4]).toContain('file20.txt');
  });

  test('respects -a all files', async () => {
    const { stdout: withoutAll } = await run([
      path.join(FIXTURES_PATH, 'single-level'),
    ]);
    const { stdout: withAll } = await run([
      '-a',
      path.join(FIXTURES_PATH, 'single-level'),
    ]);
    expect(withoutAll).not.toContain('.gitkeep');
    expect(withAll).toContain('.gitkeep');
  });

  test('help includes --gitignore option', async () => {
    const { stdout } = await run(['--help']);
    expect(stdout).toContain('--gitignore');
  });

  describe('--no-gitignore', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-cli-gitignore-'));
      execSync('git init', { cwd: tmpDir });
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'secret.txt\n');
      fs.writeFileSync(path.join(tmpDir, 'secret.txt'), '');
      fs.writeFileSync(path.join(tmpDir, 'visible.txt'), '');
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true });
    });

    test('excludes gitignored files by default', async () => {
      const { stdout } = await run([tmpDir]);
      expect(stdout).not.toContain('secret.txt');
      expect(stdout).toContain('visible.txt');
    });

    test('shows gitignored files with --no-gitignore', async () => {
      const { stdout } = await run(['--no-gitignore', tmpDir]);
      expect(stdout).toContain('secret.txt');
      expect(stdout).toContain('visible.txt');
    });
  });
});
