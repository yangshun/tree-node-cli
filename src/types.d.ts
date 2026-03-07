declare module 'junk' {
  const junk: {
    regex: RegExp;
    is(filename: string): boolean;
    not(filename: string): boolean;
  };
  export default junk;
}

declare module 'fast-folder-size/sync' {
  function folderSize(path: string): number;
  export default folderSize;
}
