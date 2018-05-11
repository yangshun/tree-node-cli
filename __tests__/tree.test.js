const fs = require('fs');
const junk = require('junk');
const path = require('path');
const tree = require('../tree');

const PATH_TO_TEST = '__tests__/fixtures';
const dirs = fs.readdirSync(PATH_TO_TEST).filter(junk.not);

describe('tree', () => {
  test('default', () => {
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir))).toMatchSnapshot();
    });
  });

  test('directoriesOnly', () => {
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        directoriesOnly: true,
      })).toMatchSnapshot();
    });
  });

  test('directoriesTrailingSlash', () => {
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        directoriesTrailingSlash: true,
      })).toMatchSnapshot();
    });
  });

  test('excludeDirs', () => {
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        excludeDirs: ['beta'],
      })).toMatchSnapshot();
    });
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        excludeDirs: ['charlie'],
      })).toMatchSnapshot();
    });
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        excludeDirs: ['beta', 'charlie'],
      })).toMatchSnapshot();
    });
  });

  test('hideHiddenFiles', () => {
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        hideHiddenFiles: false,
      })).toMatchSnapshot();
    });
  });

  test('maxDepth', () => {
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        maxDepth: 1,
      })).toMatchSnapshot();
    });
    dirs.forEach(dir => {
      expect(tree(path.join(PATH_TO_TEST, dir), {
        maxDepth: 2,
      })).toMatchSnapshot();
    });
  });
});
