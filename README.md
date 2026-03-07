# tree-node-cli

Lists the contents of directories in a tree-like format, similar to the Linux [`tree`](https://linux.die.net/man/1/tree) command. Both CLI and Node.js APIs are provided.

`tree` is a command that produces a nicely-formatted indented output of directories and files. When a directory argument is given, tree lists all the files and/or directories found in the given directory.

Note: Symlinks are not followed. Directories that cannot be opened (e.g. due to permission errors) are listed with `[error opening dir]` instead of crashing, matching Linux `tree` behavior.

## Quickstart

Instantly execute the command in your current directory via `npx` / `pnpx` / `bunx` / `yarn dlx`:

```bash
npx tree-node-cli
```

## Installation

```bash
npm install tree-node-cli
# or globally
npm install -g tree-node-cli
```

## Example

```bash
$ tree -L 2
tree-node-cli
├── CNAME
├── LICENSE
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── src
│   ├── __tests__
│   ├── cli.ts
│   ├── index.ts
│   └── types.d.ts
├── tsconfig.json
└── tsdown.config.ts
```

> [!NOTE]
> `gitignore` is respected by default so `node_modules` and other common files/directories are excluded automatically. Use `--no-gitignore` to show them.

## CLI

```bash
tree [options] [path/to/dir]
```

> [!IMPORTANT]
> Use the command `treee` on Windows and Linux to avoid conflicts with built-in `tree` command.

The following options are available:

```txt
$ tree --help

Usage:
  $ tree <command> [options]

Options:
Listing options:
  -a, --all-files           All files, including hidden files, are printed.
  -d, --dirs-only           List directories only.
  -f, --full-path           Print the full path prefix for each file.
  -L, --max-depth <n>       Max display depth of the directory tree.
  -I, --exclude <patterns>  Exclude files that match the pattern. | separates
                            alternate patterns. Wrap your entire pattern in double
                            quotes. E.g. "node_modules|coverage".
  --gitignore               Respect .gitignore files (enabled by default).
                            Use --no-gitignore to disable.
  --prune                   Remove empty directories from output.

File options:
  -Q, --quote               Quote filenames in double quotes.
  -p, --permissions         Show file type and permissions.
  -s, --sizes               Print the size of each file in bytes along with the name.
  -h, --human-readable      Print file sizes in human-readable format (powers
                            of 1024). Implies -s.
  --si                      Print file sizes using SI units (powers of 1000).
                            Implies -s.
  --du                      For each directory report its size as the accumulation
                            of sizes of all its files and sub-directories. Implies -s.
  -D, --date                Show last modification time for each entry.
  -F, --trailing-slash      Append a '/' for directories.

Sorting options:
  -v, --version-sort        Sort the output by version (natural sort of numbers
                            within text).
  -t, --sort-mtime          Sort the output by last modification time.
  -c, --sort-ctime          Sort the output by last status change time.
  -U, --unsorted            Do not sort. List files in directory order.
  -r, --reverse             Sort the output in reverse alphabetic order.
  --dirs-first              List directories before files.
  --files-first             List files before directories.
  --sort <type>             Sort the output by type: name, version, mtime,
                            ctime, size.

Graphics options:
  -i, --no-indent           Print entries without tree indentation lines.
  -S, --line-ascii          Turn on ASCII line graphics.

Output options:
  -J, --json                Output the tree as a JSON structure.

Misc options:
  --help                    Display this message
  --version                 Display version number
```

> [!TIP]
> To exclude the contents of a directory while still printing the directory itself, use a trailing slash with the `-I` option (e.g., `-I "directory/"`).
>
> For the Node.js API, provide a regex matching the directory contents (e.g., `/directory\//`). Directories listed in `.gitignore` (e.g. `node_modules`) are already excluded by default, use `--no-gitignore` in combination with `-I "directory/"` if you want them to show up.

## Node.js API

### `tree(path, options?)`

Returns the tree as a formatted string.

```js
import { tree } from 'tree-node-cli';

const string = tree('path/to/dir', {
  allFiles: true,
  exclude: [/vendor/, /lcov/],
  maxDepth: 4,
});

console.log(string);
```

### `treeJson(path, options?)`

Returns the tree as a structured `TreeJsonEntry` object (or `null` if the path is excluded).

```ts
// Discriminated union — `contents` only exists on directories
type TreeJsonEntry =
  | {
      type: 'directory';
      name: string;
      contents: TreeJsonEntry[];
      size?: number;
      mode?: string;
      time?: string;
    }
  | { type: 'file'; name: string; size?: number; mode?: string; time?: string };
// size: present when `sizes: true`
// mode: present when `permissions: true`
// time: present when `date: true`
// error: present when the directory could not be opened (e.g. permission denied)
```

```js
import { treeJson } from 'tree-node-cli';

const result = treeJson('path/to/dir', { sizes: true });
console.log(result);
// { type: 'directory', name: 'dir', size: 4096, contents: [...] }
```

### Options

`options` is a configuration object with the following fields:

| Field           | Default                    | Type       | Description                                                                                                                                                                                                                                                                                     |
| --------------- | -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allFiles`      | `false`                    | `boolean`  | All files, including hidden files, are printed.                                                                                                                                                                                                                                                 |
| `dirsOnly`      | `false`                    | `boolean`  | List directories only.                                                                                                                                                                                                                                                                          |
| `fullPath`      | `false`                    | `boolean`  | Print the full path prefix for each file.                                                                                                                                                                                                                                                       |
| `maxDepth`      | `Number.POSITIVE_INFINITY` | `number`   | Max display depth of the directory tree.                                                                                                                                                                                                                                                        |
| `exclude`       | `[]`                       | `RegExp[]` | An array of regex to test each filename against. Matching files will be excluded and matching directories will not be traversed into. To exclude a directory's contents while still showing the directory itself, use a regex that matches the path with a trailing slash (e.g., `/vendor\//`). |
| `gitignore`     | `true`                     | `boolean`  | Respect `.gitignore` files when inside a git repository. Use `--no-gitignore` to disable.                                                                                                                                                                                                       |
| `prune`         | `false`                    | `boolean`  | Remove empty directories from output.                                                                                                                                                                                                                                                           |
| `quote`         | `false`                    | `boolean`  | Quote filenames in double quotes.                                                                                                                                                                                                                                                               |
| `permissions`   | `false`                    | `boolean`  | Show file type and permissions (e.g. `[drwxr-xr-x]`).                                                                                                                                                                                                                                           |
| `sizes`         | `false`                    | `boolean`  | Print the size of each file in bytes along with the name.                                                                                                                                                                                                                                       |
| `humanReadable` | `false`                    | `boolean`  | Print file sizes in human-readable format (powers of 1024). Implies `sizes`.                                                                                                                                                                                                                    |
| `si`            | `false`                    | `boolean`  | Print file sizes using SI units (powers of 1000). Implies `sizes`.                                                                                                                                                                                                                              |
| `du`            | `false`                    | `boolean`  | For each directory, report its size as the accumulation of sizes of all its files and sub-directories. Implies `sizes`.                                                                                                                                                                         |
| `date`          | `false`                    | `boolean`  | Show last modification time for each entry.                                                                                                                                                                                                                                                     |
| `trailingSlash` | `false`                    | `boolean`  | Append a `/` for directories.                                                                                                                                                                                                                                                                   |
| `sortBy`        | `'name'`                   | `string`   | Sort the output. Options: `'name'`, `'version'`, `'mtime'`, `'ctime'`, `'size'`.                                                                                                                                                                                                                |
| `unsorted`      | `false`                    | `boolean`  | Do not sort. List files in directory order.                                                                                                                                                                                                                                                     |
| `reverse`       | `false`                    | `boolean`  | Sort the output in reverse alphabetic order.                                                                                                                                                                                                                                                    |
| `dirsFirst`     | `false`                    | `boolean`  | List directories before files.                                                                                                                                                                                                                                                                  |
| `filesFirst`    | `false`                    | `boolean`  | List files before directories.                                                                                                                                                                                                                                                                  |
| `noIndent`      | `false`                    | `boolean`  | Print entries without tree indentation lines.                                                                                                                                                                                                                                                   |
| `lineAscii`     | `false`                    | `boolean`  | Turn on ASCII line graphics.                                                                                                                                                                                                                                                                    |

## License

MIT
