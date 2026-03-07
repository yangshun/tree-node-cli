# Linux `tree` Feature Parity TODO

Track progress of implementing Linux `tree` options in tree-node-cli.

## Sorting Options (DONE)

- [x] `-v` — Sort by version (natural numeric sort)
- [x] `-t` — Sort by last modification time
- [x] `-c` — Sort by last status change time
- [x] `-U` — No sorting (directory order)
- [x] `-r` — Reverse sort order
- [x] `--dirsfirst` — List directories before files
- [x] `--filesfirst` — List files before directories
- [x] `--sort=<type>` — Unified sort flag (name, version, mtime, ctime, size)

## Listing Options (DONE)

- [x] `-f` — Print full path prefix for each file
  - Prepend the relative path to each entry name
  - CLI: `-f, --full-path`
  - API: `fullPath: boolean`

- [x] `--prune` — Remove empty directories from output
  - Skip directories that have no visible children after filtering
  - CLI: `--prune`
  - API: `prune: boolean`

- [x] `-i` — No indentation lines
  - Print entries as a flat list without tree graphics
  - Useful for piping output to other commands
  - CLI: `-i, --no-indent`
  - API: `noIndent: boolean`

## File Info Options (DONE)

- [x] `-p` — Show file type and permissions
  - Display permissions like `[drwxr-xr-x]` or `[-rw-r--r--]` before each entry
  - Use `fs.lstatSync().mode` to get permission bits
  - CLI: `-p, --permissions`
  - API: `permissions: boolean`

- [x] `-D` — Show last modification time
  - Display mtime before each entry
  - CLI: `-D, --date`
  - API: `date: boolean`

- [x] `-Q` — Quote filenames in double quotes
  - Wrap each filename in `"double quotes"`
  - CLI: `-Q, --quote`
  - API: `quote: boolean`

## Output Format Options (DONE)

- [x] `-J` — JSON output
  - Output the tree as a JSON structure
  - CLI: `-J, --json`
  - API: `json: boolean`

## Code Improvements

- [x] **Filter before stat** — `statEntries` stats all entries including hidden files that will be filtered out when `allFiles: false`. Filter hidden files before stat'ing to avoid unnecessary syscalls.
- [ ] **Match Linux `tree -s` size behavior** — `computeSizes` recursively sums file sizes into parent directories, but Linux `tree -s` shows each entry's own `stat.size` (inode size for directories, not recursive sum). Remove `computeSizes` and use `stat.size` directly.
- [x] **Merge `EXCLUDED_PATTERNS` into exclude** — The hardcoded `.DS_Store` pattern is checked in a separate loop for every entry. Merge it into the user's `exclude` array at initialization to simplify `isExcluded`.
- [x] **Clarify `dirsOnly` filtering** — `dirsOnly` is checked in both `isExcluded` (skips files early) and `filterAndOrderContents` (filters file entries). The `isExcluded` check is a performance optimization that avoids stat'ing files, but the dual responsibility could be clearer.
- [x] **Avoid mutating input arrays** — `sortContents` calls `contents.sort()` which mutates the caller's array in place. Using `[...contents].sort(...)` would be safer, though not currently a bug since callers don't reuse the array.

## Notes

- Each feature should include: implementation in `src/index.ts`, CLI flag in `src/cli.ts`, tests in `src/index.test.ts` and `src/cli.test.ts`, and README docs
- Match Linux `tree` flag names where possible
- Keep the Node.js API option names in camelCase
