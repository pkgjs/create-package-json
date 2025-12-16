'use strict';
const path = require('path');
const { promisify } = require('util');
const fs = require('fs-extra');
const execFile = promisify(require('child_process').execFile);

module.exports.author = async function author (opts = {}) {
  try {
    const [name, email] = (await Promise.all([
      execFile('git', ['config', '--get', 'user.name'], { cwd: opts.cwd }),
      execFile('git', ['config', '--get', 'user.email'], { cwd: opts.cwd })
    ])).map((p) => p.stdout.trim());
    if (!name) {
      return;
    }

    return `${name}${email ? ` <${email}>` : ''}`;
  } catch (e) {
    // Ignore errors
  }
};

// Taken from npm: https://github.com/npm/init-package-json/blob/latest/default-input.js#L188-L208
async function gitRemote (opts = {}) {
  try {
    const cwd = opts.cwd || process.cwd();
    let conf = await fs.readFile(path.join(cwd, '.git', 'config'), 'utf8');
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

    // @TODO support bitbucket and gitlab urls
    // Replace github url
    if (u && u.match(/^git@github.com:/)) {
      u = u.replace(/^git@github.com:/, 'https://github.com/');
    }

    return u;
  } catch (e) {
    // ignore error
  }
}
module.exports.remote = gitRemote;

module.exports.repository = async function (cwd, pkg) {
  if (!pkg || !pkg.repository) {
    const remote = await gitRemote({ cwd });
    if (remote) {
      return remote;
    }
  }
  if (pkg && typeof pkg.repository === 'string') {
    return pkg.repository;
  }
  if (pkg && typeof pkg.repository !== 'undefined' && pkg.repository.url) {
    return pkg.repository.url;
  }
};

module.exports.repositoryRoot = async function repositoryRoot (cwd) {
  try {
    // Since we call this *before* creating the new pacakge directory in a monorepo,
    // we need to find the first real directory above `cwd` because otherwise this
    // command will succeede but use the system cwd instead
    let _cwd = cwd;
    while (_cwd !== '/') {
      try {
        const p = await fs.realpath(_cwd);
        await fs.access(p, fs.constants.W_OK | fs.constants.R_OK);
        _cwd = p;
        break;
      } catch (e) {
        _cwd = path.dirname(_cwd);
      }
    }

    const out = await execFile('git', ['rev-parse', '--show-toplevel'], { cwd: _cwd });
    return out.stdout.trim();
  } catch (e) {
    // Ignore errors
  }
};
