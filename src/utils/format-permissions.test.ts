import { describe, expect, test } from 'vitest';
import { formatPermissions } from './format-permissions';

describe('formatPermissions', () => {
  test('formats directory with full permissions', () => {
    expect(formatPermissions(0o777, true)).toBe('[drwxrwxrwx]');
  });

  test('formats file with full permissions', () => {
    expect(formatPermissions(0o777, false)).toBe('[-rwxrwxrwx]');
  });

  test('formats typical file permissions (644)', () => {
    expect(formatPermissions(0o644, false)).toBe('[-rw-r--r--]');
  });

  test('formats typical directory permissions (755)', () => {
    expect(formatPermissions(0o755, true)).toBe('[drwxr-xr-x]');
  });

  test('formats no permissions', () => {
    expect(formatPermissions(0o000, false)).toBe('[----------]');
  });

  test('formats execute only', () => {
    expect(formatPermissions(0o111, false)).toBe('[---x--x--x]');
  });

  test('formats write only', () => {
    expect(formatPermissions(0o222, false)).toBe('[--w--w--w-]');
  });

  test('formats read only', () => {
    expect(formatPermissions(0o444, false)).toBe('[-r--r--r--]');
  });
});
