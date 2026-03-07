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

Usage: tree [options]

Options:
  -a, --all-files           All files, include hidden files, are printed.
  --dirs-first              List directories before files.
  -d, --dirs-only           List directories only.
  -s, --sizes               Print the size of each file in bytes along with the name.
  -I, --exclude [patterns]  Exclude files that match the pattern. | separates
                            alternate patterns. Wrap your entire pattern in double
                            quotes. E.g. "node_modules|coverage".
  -L, --max-depth <n>       Max display depth of the directory tree.
  -r, --reverse             Sort the output in reverse alphabetic order.
  -F, --trailing-slash      Append a '/' for directories.
  -S, --line-ascii          Turn on ASCII line graphics.
  -h, --help                display help for command
```

## Node.js API

```js
import tree from 'tree-node-cli';

const string = tree('path/to/dir', options);
```

`options` is a configuration object with the following fields:

| Field           | Default                    | Type       | Description                                                                                                                           |
| --------------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `allFiles`      | `false`                    | `boolean`  | All files are printed. By default, tree does not print hidden files (those beginning with a dot).                                     |
| `dirsFirst`     | `false`                    | `boolean`  | List directories before files.                                                                                                        |
| `dirsOnly`      | `false`                    | `boolean`  | List directories only.                                                                                                                |
| `sizes`         | `false`                    | `boolean`  | Show filesizes as well.                                                                                                               |
| `exclude`       | `[]`                       | `RegExp[]` | An array of regex to test each filename against. Matching files will be excluded and matching directories will not be traversed into. |
| `maxDepth`      | `Number.POSITIVE_INFINITY` | `number`   | Max display depth of the directory tree.                                                                                              |
| `reverse`       | `false`                    | `boolean`  | Sort the output in reverse alphabetic order.                                                                                          |
| `trailingSlash` | `false`                    | `boolean`  | Appends a trailing slash behind directories.                                                                                          |
| `lineAscii`     | `false`                    | `boolean`  | Turn on ASCII line graphics.                                                                                                          |

```js
import tree from 'tree-node-cli';

const string = tree('path/to/dir', {
  allFiles: true,
  exclude: [/node_modules/, /lcov/],
  maxDepth: 4,
});

console.log(string);
```

**Note:** To exclude the contents of a directory while retaining the directory itself, use a trailing slash with the `-I` option (e.g., `-I "node_modules/"`). For the Node.js API, provide a regex matching the directory contents (e.g., `/node_modules\//`). See [#33](https://github.com/yangshun/tree-node-cli/issues/33) for more details.

## License

MIT
