export function formatPermissions(mode: number, isDir: boolean): string {
  const type = isDir ? 'd' : '-';
  const rwx = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
  const owner = rwx[(mode >> 6) & 7];
  const group = rwx[(mode >> 3) & 7];
  const others = rwx[mode & 7];
  return `[${type}${owner}${group}${others}]`;
}
