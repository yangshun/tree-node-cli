import type { RequiredOptions, TreeNode } from '../index';
import { formatPermissions } from '../utils/format-permissions';

export interface JsonNode {
  type: 'directory' | 'file';
  name: string;
  size?: number;
  mode?: string;
  time?: string;
  contents?: JsonNode[];
}

export function formatAsJson(
  node: TreeNode,
  options: RequiredOptions,
): JsonNode {
  const jsonNode: JsonNode = {
    type: node.isDirectory ? 'directory' : 'file',
    name: node.name,
  };

  if (options.sizes) {
    jsonNode.size = node.size;
  }

  if (options.permissions) {
    jsonNode.mode = formatPermissions(node.mode, node.isDirectory);
  }

  if (options.date) {
    jsonNode.time = `${node.mtime.toLocaleDateString('en-CA')} ${node.mtime.toLocaleTimeString('en-GB')}`;
  }

  if (node.isDirectory) {
    jsonNode.contents = node.children.map((child) =>
      formatAsJson(child, options),
    );
  }

  return jsonNode;
}
