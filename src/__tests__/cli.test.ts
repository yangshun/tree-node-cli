import { execFile } from 'child_process';
import path from 'path';
import { describe, expect, test } from 'vitest';

const CLI_PATH = path.resolve(__dirname, '../../dist/cli.cjs');
const FIXTURES_PATH = path.join(__dirname, '__fixtures__');

function run(
  args: string[] = [],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile('node', [CLI_PATH, ...args], (error, stdout, stderr) => {
      resolve({
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        exitCode: error ? 1 : 0,
      });
    });
  });
}

describe('cli', () => {
  test('displays version with -v', async () => {
    const { stdout, exitCode } = await run(['-v']);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    expect(exitCode).toBe(0);
  });

  test('displays help with -h', async () => {
    const { stdout, exitCode } = await run(['-h']);
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
});
