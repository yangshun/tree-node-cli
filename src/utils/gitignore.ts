import fs from 'fs';
import nodePath from 'path';
import ignore, { type Ignore } from 'ignore';

/**
 * Walks up from `startPath` looking for a `.git` directory.
 * Returns the directory containing `.git`, or `null` if not in a git repo.
 */
export function findGitRoot(startPath: string): string | null {
  let dir = nodePath.resolve(startPath);
  while (true) {
    try {
      fs.lstatSync(nodePath.join(dir, '.git'));
      return dir;
    } catch {
      const parent = nodePath.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }
}

/**
 * Reads `.gitignore` from `dirPath` and returns its lines.
 * Returns `[]` if no `.gitignore` exists.
 */
function readGitignorePatterns(dirPath: string): string[] {
  try {
    return fs
      .readFileSync(nodePath.join(dirPath, '.gitignore'), 'utf8')
      .split(/\r?\n/);
  } catch {
    return [];
  }
}

export interface GitignoreFilter {
  /** Check if a relative path (from git root) is ignored. */
  ignores(relativePath: string, isDirectory: boolean): boolean;
  /** Load nested .gitignore for a directory (called as we descend into it). */
  loadNestedGitignore(dirAbsPath: string): void;
}

/**
 * Creates a filter that checks paths against `.gitignore` rules.
 * Reads the root `.gitignore` and supports nested `.gitignore` files
 * loaded incrementally via `loadNestedGitignore`.
 */
export function createGitignoreFilter(gitRoot: string): GitignoreFilter {
  const rootIg = ignore();

  // Always ignore .git itself.
  rootIg.add('.git');
  rootIg.add(readGitignorePatterns(gitRoot));

  // Cache for nested ignore instances keyed by dir path relative to gitRoot.
  const nestedIgnores = new Map<string, Ignore>();

  return {
    ignores(relativePath: string, isDirectory: boolean): boolean {
      // Paths outside the git root (starting with "..") cannot be ignored.
      if (relativePath.startsWith('..')) return false;

      const pathToCheck = isDirectory ? `${relativePath}/` : relativePath;

      if (rootIg.ignores(pathToCheck)) return true;

      // Check nested .gitignore files along the path.
      const parts = relativePath.split('/');
      for (let i = 1; i < parts.length; i++) {
        const parentDir = parts.slice(0, i).join('/');
        const nested = nestedIgnores.get(parentDir);
        if (nested) {
          const relToParent = parts.slice(i).join('/');
          const check = isDirectory ? `${relToParent}/` : relToParent;
          if (nested.ignores(check)) return true;
        }
      }

      return false;
    },

    loadNestedGitignore(dirAbsPath: string): void {
      const relDir = nodePath.relative(gitRoot, dirAbsPath);
      // Skip the root (already loaded) and dirs we've already processed.
      if (!relDir || nestedIgnores.has(relDir)) return;

      const patterns = readGitignorePatterns(dirAbsPath);
      if (patterns.length > 0) {
        nestedIgnores.set(relDir, ignore().add(patterns));
      }
    },
  };
}
