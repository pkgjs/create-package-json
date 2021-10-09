'use strict';
const path = require('path');
const fs = require('fs-extra');
const execa = require('execa');

module.exports.author = async function author () {
  try {
    const [{ stdout: name }, { stdout: email }] = await Promise.all([
      execa('git', ['config', '--get', 'user.name']),
      execa('git', ['config', '--get', 'user.email'])
    ]);
    if (!name) {
      return;
    }

    return `${name}${email ? ` <${email}>` : ''}`;
  } catch (e) {
    // Ignore errors
  }
};

// Taken from npm: https://github.com/npm/init-package-json/blob/latest/default-input.js#L188-L208
module.exports.remote = async function remote (opts = {}) {
  try {
    const dir = opts.directory || process.cwd();
    let conf = await fs.readFile(path.join(dir, '.git', 'config'), 'utf8');
    conf = conf.split(/\r?\n/);
    const i = conf.indexOf('[remote "origin"]');
    let u;
    if (i !== -1) {
      // Check if one of the next two lines is the remote url
      u = conf[i + 1];
      if (!u.match(/^\s*url =/)) {
        u = conf[i + 2];
      }
      if (!u.match(/^\s*url =/)) {
        u = null;
      } else {
        u = u.replace(/^\s*url = /, '');
      }
    }

    // Replace github url
    if (u && u.match(/^git@github.com:/)) {
      u = u.replace(/^git@github.com:/, 'https://github.com/');
    }

    return u;
  } catch (e) {
    // ignore error
  }
};
