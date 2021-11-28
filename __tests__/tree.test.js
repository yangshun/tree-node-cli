const fs = require('fs');
const junk = require('junk');
const path = require('path');
const tree = require('../tree');

const PATH_TO_TEST = '__tests__/__fixtures__';
const dirs = fs.readdirSync(PATH_TO_TEST).filter(junk.not);

describe('tree', () => {
  test('default', () => {
    dirs.forEach((dir) => {
      expect(tree(path.join(PATH_TO_TEST, dir))).toMatchSnapshot();
    });
  });

  test('allFiles', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          allFiles: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('dirsFirst', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          dirsFirst: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('sizes', () => {
    dirs.forEach((dir) => {
      console.log(path.join(PATH_TO_TEST, dir));
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          sizes: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('dirsOnly', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          dirsOnly: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('exclude', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          exclude: [/beta/],
        }),
      ).toMatchSnapshot();
    });
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          exclude: [/charlie/],
        }),
      ).toMatchSnapshot();
    });
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          exclude: [/beta/, /charlie/],
        }),
      ).toMatchSnapshot();
    });
  });

  test('maxDepth', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          maxDepth: 1,
        }),
      ).toMatchSnapshot();
    });
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          maxDepth: 2,
        }),
      ).toMatchSnapshot();
    });
  });

  test('reverse', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          reverse: true,
        }),
      ).toMatchSnapshot();
    });
  });

  test('trailingSlash', () => {
    dirs.forEach((dir) => {
      expect(
        tree(path.join(PATH_TO_TEST, dir), {
          trailingSlash: true,
        }),
      ).toMatchSnapshot();
    });
  });
});
