# tree-node-cli

Lists the contents of directories in a tree-like format, similar to the Linux [`tree`](https://linux.die.net/man/1/tree) command. Both CLI and Node APIs are provided.

`tree` is a command that produces a nicely-formatted indented output of directories and files. When a directory argument is given, tree lists all the files and/or directories found in the given directory.

Note: Symlinks are not followed.

## Quickstart

Instantly execute the command in your current directory via `npx`:

```bash
npx tree-node-cli -I "node_modules" # ignore node_modules
```

Or via Yarn 2+:

```bash
yarn dlx -p tree-node-cli tree -I "node_modules" # ignore node_modules
```

## Installation

```bash
$ npm install tree-node-cli
# or globally
$ npm install -g tree-node-cli
```

## Example

```bash
$ tree -L 2 -I "node_modules"
tree-node-cli
├── LICENSE
├── README.md
├── __tests__
│   ├── __fixtures__
│   ├── __snapshots__
│   ├── fixtures
│   └── tree.test.js
├── bin
│   └── tree
├── jest.config.js
├── package.json
├── tree.js
└── yarn.lock
```

## CLI

```bash
$ tree [options] [path/to/dir]
```

**Note:** Use the command `treee` on Windows and Linux to avoid conflicts with built-in `tree` command.

The following options are available:

```txt
$ tree -h

  Usage: tree [options]

  Options:

    -V, --version             output the version number
    -a, --all-files           All files, include hidden files, are printed.
    --dirs-first              List directories before files.
    -d, --dirs-only           List directories only.
    -s, --sizes               Show filesizes.
    -I, --exclude [patterns]  Exclude files that match the pattern. | separates alternate patterns. Wrap your entire pattern in double quotes. E.g. `"node_modules|coverage".
    -L, --max-depth <n>       Max display depth of the directory tree.
    -r, --reverse             Sort the output in reverse alphabetic order.
    -F, --trailing-slash      Append a '/' for directories.
    -S, --line-ascii          Turn on ASCII line graphics.
    -h, --help                output usage information
```

## Node.js API

```js
const tree = require('tree-node-cli');
const string = tree('path/to/dir', options);
```

`options` is a configuration object with the following fields:

| Field           | Default                    | Type    | Description                                                                                                                           |
| --------------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `allFiles`      | `false`                    | Boolean | All files are printed. By default, tree does not print hidden files (those beginning with a dot).                                     |
| `dirsFirst`     | `false`                    | Boolean | List directories before files.                                                                                                        |
| `dirsOnly`      | `false`                    | Boolean | List directories only.                                                                                                                |
| `sizes`         | `false`                    | Boolean | Show filesizes as well.                                                                                                               |
| `exclude`       | `[]`                       | Array   | An array of regex to test each filename against. Matching files will be excluded and matching directories will not be traversed into. |
| `maxDepth`      | `Number.POSITIVE_INFINITY` | Number  | Max display depth of the directory tree.                                                                                              |
| `reverse`       | `false`                    | Boolean | Sort the output in reverse alphabetic order.                                                                                          |
| `trailingSlash` | `false`                    | Boolean | Appends a trailing slash behind directories.                                                                                          |
| `lineAscii`     | `false`                    | Boolean | Turn on ASCII line graphics.                                                                                                          |

```js
const string = tree('path/to/dir', {
  allFiles: true,
  exclude: [/node_modules/, /lcov/],
  maxDepth: 4,
});

console.log(string);
```

_Note:_ To exclude the contents of a directory while retaining the directory itself, use a trailing slash with the `-I` option (e.g., `-I "node_modules/"`). For the Node.js API, provide a regex matching the directory contents (e.g., `/node_modules\//`). See Issue https://github.com/yangshun/tree-node-cli/issues/33 for more details.

## License

MIT
