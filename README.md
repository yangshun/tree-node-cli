# tree-node-cli

Lists the contents of directories in a tree-like format, similar to the Linux [`tree`](https://linux.die.net/man/1/tree) command. Both CLI and Node.js APIs are provided.

`tree` is a command that produces a nicely-formatted indented output of directories and files. When a directory argument is given, tree lists all the files and/or directories found in the given directory.

Note: Symlinks are not followed.

## Quickstart

Instantly execute the command in your current directory via `npx`:

```bash
npx tree-node-cli -I "node_modules" # ignore node_modules
```

## Installation

```bash
npm install tree-node-cli
# or globally
npm install -g tree-node-cli
```

## Example

```bash
$ tree -L 2 -I "node_modules"
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

## CLI

```bash
tree [options] [path/to/dir]
```

**Note:** Use the command `treee` on Windows and Linux to avoid conflicts with built-in `tree` command.

The following options are available:

```txt
$ tree -h

Usage:
  $ tree <command> [options]

Options:
  -a, --all-files           All files, include hidden files, are printed.
  -D, --date                Show last modification time for each entry.
  -f, --full-path           Print the full path prefix for each file.
  -i, --no-indent           Print entries without tree indentation lines.
  -J, --json                Output the tree as a JSON structure.
  -p, --permissions         Show file type and permissions.
  -Q, --quote               Quote filenames in double quotes.
  --prune                   Remove empty directories from output.
  --dirs-first              List directories before files.
  -d, --dirs-only           List directories only.
  -s, --sizes               Print the size of each file in bytes along with the name.
  -I, --exclude <patterns>  Exclude files that match the pattern. | separates
                            alternate patterns. Wrap your entire pattern in double
                            quotes. E.g. "node_modules|coverage".
  -L, --max-depth <n>       Max display depth of the directory tree.
  -r, --reverse             Sort the output in reverse alphabetic order.
  -F, --trailing-slash      Append a '/' for directories.
  -S, --line-ascii          Turn on ASCII line graphics.
  -v, --version-sort        Sort the output by version (natural sort of numbers
                            within text).
  -t, --sort-mtime          Sort the output by last modification time.
  -c, --sort-ctime          Sort the output by last status change time.
  -U, --unsorted            Do not sort. List files in directory order.
  --files-first             List files before directories.
  --sort <type>             Sort the output by type: name, version, mtime,
                            ctime, size.
  -h, --help                Display this message
  --version                 Display version number
```

## Node.js API

### `tree(path, options?)`

Returns the tree as a formatted string.

```js
import { tree } from 'tree-node-cli';

const string = tree('path/to/dir', {
  allFiles: true,
  exclude: [/node_modules/, /lcov/],
  maxDepth: 4,
});

console.log(string);
```

### `treeJson(path, options?)`

Returns the tree as a structured `TreeJsonEntry` object (or `null` if the path is excluded).

```ts
// Discriminated union — `contents` only exists on directories
type TreeJsonEntry =
  | { type: 'directory'; name: string; contents: TreeJsonEntry[];
      size?: number; mode?: string; time?: string }
  | { type: 'file'; name: string;
      size?: number; mode?: string; time?: string }
// size: present when `sizes: true`
// mode: present when `permissions: true`
// time: present when `date: true`
```

```js
import { treeJson } from 'tree-node-cli';

const result = treeJson('path/to/dir', { sizes: true });
console.log(result);
// { type: 'directory', name: 'dir', size: 4096, contents: [...] }
```

### Options

`options` is a configuration object with the following fields:

| Field           | Default                    | Type       | Description                                                                                                                           |
| --------------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `allFiles`      | `false`                    | `boolean`  | All files are printed. By default, tree does not print hidden files (those beginning with a dot).                                     |
| `date`          | `false`                    | `boolean`  | Show last modification time for each entry.                                                                                           |
| `dirsFirst`     | `false`                    | `boolean`  | List directories before files.                                                                                                        |
| `fullPath`      | `false`                    | `boolean`  | Print the full path prefix for each file.                                                                                             |
| `noIndent`      | `false`                    | `boolean`  | Print entries without tree indentation lines.                                                                                         |
| `permissions`   | `false`                    | `boolean`  | Show file type and permissions (e.g. `[drwxr-xr-x]`).                                                                                |
| `quote`         | `false`                    | `boolean`  | Quote filenames in double quotes.                                                                                                     |
| `prune`         | `false`                    | `boolean`  | Remove empty directories from output.                                                                                                 |
| `dirsOnly`      | `false`                    | `boolean`  | List directories only.                                                                                                                |
| `sizes`         | `false`                    | `boolean`  | Show filesizes as well.                                                                                                               |
| `exclude`       | `[]`                       | `RegExp[]` | An array of regex to test each filename against. Matching files will be excluded and matching directories will not be traversed into. |
| `maxDepth`      | `Number.POSITIVE_INFINITY` | `number`   | Max display depth of the directory tree.                                                                                              |
| `reverse`       | `false`                    | `boolean`  | Sort the output in reverse alphabetic order.                                                                                          |
| `trailingSlash` | `false`                    | `boolean`  | Appends a trailing slash behind directories.                                                                                          |
| `lineAscii`     | `false`                    | `boolean`  | Turn on ASCII line graphics.                                                                                                          |
| `filesFirst`    | `false`                    | `boolean`  | List files before directories.                                                                                                        |
| `sortBy`        | `'name'`                   | `string`   | Sort the output. Options: `'name'`, `'version'`, `'mtime'`, `'ctime'`, `'size'`.                                                     |
| `unsorted`      | `false`                    | `boolean`  | Do not sort. List files in directory order.                                                                                            |

**Note:** To exclude the contents of a directory while retaining the directory itself, use a trailing slash with the `-I` option (e.g., `-I "node_modules/"`). For the Node.js API, provide a regex matching the directory contents (e.g., `/node_modules\//`). See [#33](https://github.com/yangshun/tree-node-cli/issues/33) for more details.

## License

MIT
