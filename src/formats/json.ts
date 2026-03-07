import type { RequiredOptions, TreeNode } from '../index';
import { formatPermissions } from '../utils/format-permissions';

interface TreeJsonEntryBase {
  name: string;
  size?: number;
  mode?: string;
  time?: string;
  error?: string;
}

interface TreeJsonDirectoryEntry extends TreeJsonEntryBase {
  type: 'directory';
  contents: TreeJsonEntry[];
}

interface TreeJsonFileEntry extends TreeJsonEntryBase {
  type: 'file';
}

export type TreeJsonEntry = TreeJsonDirectoryEntry | TreeJsonFileEntry;

export function formatAsJson(
  node: TreeNode,
  options: RequiredOptions,
): TreeJsonEntry {
  const base: TreeJsonEntryBase = {
    name: node.name,
  };

  if (options.sizes) {
    base.size = node.size;
  }

  if (options.permissions) {
    base.mode = formatPermissions(node.mode, node.isDirectory);
  }

  if (options.date) {
    base.time = `${node.mtime.toLocaleDateString('en-CA')} ${node.mtime.toLocaleTimeString('en-GB')}`;
  }

  if (node.openError) {
    base.error = 'error opening dir';
  }

  if (node.isDirectory) {
    return {
      ...base,
      type: 'directory',
      contents: node.children.map((child) => formatAsJson(child, options)),
    };
  }

  return { ...base, type: 'file' };
}
