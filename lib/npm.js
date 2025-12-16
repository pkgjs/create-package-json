'use strict';
const { promisify } = require('util');
const path = require('path');
const fs = require('fs/promises');
const execFile = promisify(require('child_process').execFile);
const npa = require('npm-package-arg');
const semver = require('semver');
const validateNpmPackageName = require('validate-npm-package-name');
const mapWorkspaces = require('@npmcli/map-workspaces');

// Remove npm env vars from the commands, this
// is so it respects the directory it is run in,
// otherwise this overrides things in .npmrc
const env = Object.keys(process.env).reduce((e, key) => {
  if (key.startsWith('npm_')) {
    return e;
  }
  e[key] = process.env[key];
  return e;
}, {});

module.exports.install = install;
function install (deps = [], opts = {}) {
  if (deps !== null && (!deps || !deps.length)) {
    return Promise.resolve();
  }

  let args = ['i'];

  // If we are installing deps, respect those flags
  if (deps !== null) {
    if (opts.save === false) {
      args.push('--no-save');
    } else {
      args.push(`--save-${opts.save || 'prod'}`);
      if (opts.exact) {
        args.push('--save-exact');
      }
      if (opts.bundle) {
        args.push('--save-bundle');
      }
    }
    if (opts.workspace) {
      args.push('-w', opts.workspace);
    }
    args = args.concat(deps);
  }

  return execFile('npm', args, {
    env,
    cwd: opts.directory || process.cwd()
  });
}

const packageTypes = ['tag', 'git', 'version', 'range', 'file', 'directory', 'remote'];

module.exports.normalizePackageName = normalizePackageName;
function normalizePackageName (name, opts = {}) {
  const allowedTypes = opts.allowedTypes || packageTypes;
  const pkg = npa(name);

  if (!allowedTypes.includes(pkg.type)) {
    // First try to validate the name incase npa miss categorized as a file/dir
    throw new Error(`Invalid package type specifier (${pkg.type} - ${pkg.raw})`);
  }

  if (
    typeof pkg.rawSpec !== 'string' || (
      pkg.rawSpec.length > 0 && (
        semver.coerce(pkg.rawSpec, { loose: true }) == null && (
          pkg.rawSpec === '*' || pkg.rawSpec.startsWith('<=') || pkg.rawSpec.startsWith('>=')
        ) === false)
    )
  ) {
    throw new Error(`Invalid package semver specifier (${pkg.rawSpec} - ${pkg.raw})`);
  }

  switch (pkg.type) {
    // Directory checkes for package.json and
    // hosted means it looks like a remote repo or tarball
    case 'directory':
    case 'file':
    case 'remote':
    case 'git':
      // @TODO validate that it exists?
      break;
    case 'tag':
    case 'version':
    case 'range':
      validateName(pkg);
      break;
  }

  return pkg;
}

function validateName (pkg) {
  // Manual check because the validate package just says "name cannot be null"
  if (!pkg.name) {
    throw new Error(`Invalid package name (${pkg.raw} - name cannot be empty)`);
  }

  const v = validateNpmPackageName(pkg.name);
  if (v.errors || v.warnings) {
    const msg = (v.errors && v.errors[0]) || (v.warnings || v.warnings[0]);
    throw new Error(`Invalid package name (${pkg.raw}${msg ? ` - ${msg}` : ''})`);
  }
}

module.exports.validatePackageSpec = validatePackageSpec;
function validatePackageSpec (name, opts = {}) {
  const names = Array.isArray(name) ? name : [name];
  for (let i = 0; i < names.length; i++) {
    try {
      validatePackageName(names[i]);
    } catch (e) {
      return e;
    }
  }
  return true;
}

module.exports.validatePackageName = validatePackageName;
function validatePackageName (name) {
  try {
    normalizePackageName(name, {
      allowedTypes: ['tag', 'range', 'version']
    });
  } catch (e) {
    return new Error(`${e.message}
>> This most likely indicates an invalid package name. See here:
>> https://www.npmjs.com/package/validate-npm-package-name#naming-rules`);
  }
  return true;
}

module.exports.readPkg = readPkg;
async function readPkg (cwd) {
  return JSON.parse(await fs.readFile(path.join(cwd, 'package.json')));
}

async function findNearestPackageJson (cwd, root = '/', filter = (dir, pkg) => !!pkg) {
  let pkg;
  let _cwd = cwd;
  while (_cwd) {
    try {
      pkg = await readPkg(_cwd);
      if (filter(_cwd, pkg)) {
        break;
      }
    } catch (e) {
      // ignore
    }

    if (_cwd === root) {
      break;
    }
    _cwd = path.dirname(_cwd);
  }
  if (!pkg) {
    return [null, cwd];
  }
  return [pkg, _cwd];
}

module.exports.findWorkspaceRoot = findWorkspaceRoot;
async function findWorkspaceRoot (cwd, root = '/') {
  const [firstPkg, dir] = await findNearestPackageJson(cwd, root);

  // No package.json found inside root
  if (!firstPkg) {
    return [null, cwd];
  }

  // The closest directory with a package.json looks like a workspace root
  if (firstPkg.workspaces || root === dir) {
    return [firstPkg, dir];
  }

  const [workspacePkg, dir2] = await findNearestPackageJson(path.dirname(dir), root, (d, pkg) => {
    return !!pkg?.workspaces;
  });

  // Found what looks like a workspace root
  if (workspacePkg) {
    return [workspacePkg, dir2];
  }

  // No package in root defining a workspace, so return the first
  return [firstPkg, dir];
}

module.exports.searchForWorkspaces = searchForWorkspaces;
async function searchForWorkspaces (cwd = process.cwd(), pkg, pattern = '**/*') {
  return mapWorkspaces({
    pkg: {
      ...pkg,
      workspaces: [pattern]
    },
    cwd
  });
}
