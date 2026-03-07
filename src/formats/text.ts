import nodePath from 'path';
import prettyBytes from 'pretty-bytes';

import type { RequiredOptions, TreeNode } from '../index';
import { formatPermissions } from '../utils/format-permissions';

const SYMBOLS_ANSI = {
  BRANCH: '├── ',
  EMPTY: '',
  INDENT: '    ',
  LAST_BRANCH: '└── ',
  VERTICAL: '│   ',
};

const SYMBOLS_ASCII = {
  BRANCH: '|-- ',
  EMPTY: '',
  INDENT: '    ',
  LAST_BRANCH: '`-- ',
  VERTICAL: '|   ',
};

export function formatAsText(
  node: TreeNode,
  options: RequiredOptions,
  rootPath: string,
  precedingSymbols: string = '',
  currentDepth: number = 0,
  isLast?: boolean,
): string[] {
  const SYMBOLS = options.lineAscii ? SYMBOLS_ASCII : SYMBOLS_ANSI;

  // Build the line for this entry.
  const line: string[] = options.noIndent ? [] : [precedingSymbols];

  if (!options.noIndent && currentDepth >= 1) {
    line.push(isLast ? SYMBOLS.LAST_BRANCH : SYMBOLS.BRANCH);
  }

  if (options.permissions) {
    line.push(formatPermissions(node.mode, node.isDirectory));
    line.push(' ');
  }

  if (options.date) {
    const dateStr = `[${node.mtime.toLocaleDateString('en-CA')} ${node.mtime.toLocaleTimeString('en-GB')}]`;
    line.push(dateStr);
    line.push(' ');
  }

  if (options.sizes) {
    const prettifiedFilesize = prettyBytes(node.size);
    line.push(prettifiedFilesize.replace(' ', ''));
    line.push(' ');
  }

  const displayName = options.fullPath
    ? nodePath.relative(nodePath.dirname(rootPath), node.path)
    : node.name;
  line.push(options.quote ? `"${displayName}"` : displayName);

  if (node.isDirectory && options.trailingSlash) {
    line.push('/');
  }

  const lines = [line.join('')];

  // Recurse into children.
  node.children.forEach((child, index) => {
    const isCurrentLast = index === node.children.length - 1;
    const childLines = formatAsText(
      child,
      options,
      rootPath,
      options.noIndent
        ? ''
        : precedingSymbols +
            (currentDepth >= 1
              ? isLast
                ? SYMBOLS.INDENT
                : SYMBOLS.VERTICAL
              : SYMBOLS.EMPTY),
      currentDepth + 1,
      isCurrentLast,
    );
    lines.push(...childLines);
  });

  return lines;
}
