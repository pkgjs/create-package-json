'use strict';

module.exports = () => {
  return {
    files: ['package.json', 'index.js', 'lib/**/*.js', 'bin/*', 'test/fixtures/**/*', 'test/fixtures/**/.*' ],
    tests: ['test/*.js'],
    env: {
      type: 'node',
      runner: 'node'
    },
    testFramework: 'mocha'
  };
};
