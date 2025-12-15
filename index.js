'use strict';
const path = require('path');
const fs = require('fs-extra');
const opta = require('opta');
const parseList = require('safe-parse-list');
const { create, load } = require('@npmcli/package-json');
const { Loggerr } = require('loggerr');
const packageName = require('./lib/package-name');
const git = require('./lib/git');
const npm = require('./lib/npm');

function initOpts () {
  return opta({
    commandDescription: 'Generate a package.json',
    options: {
      cwd: {
        description: 'Directory to run in',
        default: process.cwd(),
        prompt: false,
        flag: {
          alias: 'd',
          defaultDescription: 'process.cwd()',
          default: () => process.cwd()
        }
      },
      silent: {
        type: 'boolean',
        prompt: false,
        flag: {
          conflicts: ['verbose']
        }
      },
      verbose: {
        type: 'boolean',
        prompt: false,
        flag: {
          conflicts: ['silent']
        }
      },

      ignoreExisting: {
        description: 'Ignore existing files (& overwrite them)',
        default: false,
        prompt: false,
        flag: {
          key: 'ignore-existing'
        }
      },

      name: {
        type: 'string',
        prompt: {
          message: 'Package name:',
          validate: npm.validatePackageName,
          default: (promptInput, allInput) => {
            return packageName(allInput.name, allInput.scope, allInput.cwd);
          }
        }
      },
      scope: {
        type: 'string',
        description: 'Set a scope to be used when suggesting a package name',
        prompt: false
      },
      version: {
        type: 'string',
        flag: {
          key: 'package-version',
          alias: 'V'
        },
        prompt: {
          message: 'Initial version:',
          default: (promptInput, allInput) => {
            return allInput.version || '1.0.0';
          }
        }
      },
      description: {
        type: 'string',
        prompt: {
          message: 'Description:'
        }
      },
      author: {
        type: 'string',
        prompt: {
          message: 'Author:',
          default: (promptInput, allInput) => {
            return allInput.author;
          }
        }
      },
      repository: {
        type: 'string',
        prompt: {
          message: 'Repository:',
          default: (promptInput, allInput) => {
            return allInput.repository;
          }
        }
      },
      keywords: {
        type: 'string',
        prompt: {
          message: 'Keywords:',
          filter: parseList
        }
      },
      // @TODO create a license generator
      license: {
        type: 'string',
        default: 'ISC',
        prompt: {
          message: 'License:'
        }
      },

      workspaces: {
        type: 'string',
        prompt: {
          message: 'Workspaces:',
          filter: parseList
        }
      },

      type: {
        type: 'string',
        prompt: {
          message: 'Module Type:',
          type: 'list',
          choices: ['commonjs', 'module'],
          default: (promptInput, allInput) => {
            return allInput.type || 'commonjs';
          }
        }
      },
      main: {
        type: 'string',
        prompt: {
          message: 'Main:',
          default: (promptInput, allInput) => {
            return allInput.main || 'index.js';
          }
        }
      },
      private: {
        type: 'boolean',
        prompt: false
      },

      dependencies: {
        type: 'string',
        prompt: {
          message: 'Dependencies:',
          filter: parseList,
          validate: npm.validatePackageSpec
        }
      },
      devDependencies: {
        type: 'string',
        flag: {
          key: 'dev-dependencies'
        },
        prompt: {
          message: 'Dev Dependencies:',
          filter: parseList,
          validate: npm.validatePackageSpec
        }
      },
      peerDependencies: {
        type: 'string',
        flag: {
          key: 'peer-dependencies'
        },
        prompt: false
      },

      // Scripts is an odd one
      scripts: {
        flag: false,
        prompt: false,
        default: {
          test: 'echo "Error: no test specified" && exit 1'
        }
      },

      // @TODO detect from existing file
      spacer: {
        type: 'string',
        default: 2,
        flag: {
          defaultDescription: '2 spaces'
        },
        prompt: false
      },

      // Tell npm to save exact
      saveExact: {
        type: 'boolean',
        default: false,
        flag: {
          key: 'save-exact'
        },
        prompt: false
      }
    }
  });
}

module.exports = main;
async function main (input, _opts = {}) {
  const options = initOpts();
  options.overrides({
    ...input,
    cwd: input.cwd || process.cwd()
  });
  let opts = options.values();

  const log = _opts.logger || new Loggerr({
    level: (opts.silent && 'silent') || (opts.verbose && 'debug') || 'info',
    formatter: 'cli'
  });

  // Read current state and set defaults
  const pkg = opts.ignoreExisting ? await create(opts.cwd) : await readPackageJson(options, { log });

  await options.prompt({
    promptor: _opts.promptor
  })();

  opts = options.values();
  return write(opts, await format(opts, pkg), { log });
}

module.exports.options = initOpts().options;
module.exports.cli = function () {
  return initOpts().cli((yargs) => {
    yargs.command('$0', 'Generate a package.json', () => {}, main);
  });
};

module.exports.readPackageJson = readPackageJson;
async function readPackageJson (options, { log } = {}) {
  const opts = options.values();
  let packageInstance;
  let pkg = {};
  try {
    packageInstance = await load(opts.cwd, {
      create: true
    });
    pkg = packageInstance.content;
    log.debug('Read existing package.json', pkg);
  } catch (e) {
    // ignore if missing or unreadable
    log.error(e);
  }

  let author;
  if (!pkg || !pkg.author) {
    const gitAuthor = await git.author({ cwd: opts.cwd });
    if (gitAuthor) {
      author = gitAuthor;
    }
  } else if (pkg && typeof pkg.author === 'string') {
    author = pkg.author;
  } else if (pkg && typeof pkg.author !== 'undefined') {
    author = `${pkg.author.name}${pkg.author.email ? ` <${pkg.author.email}>` : ''}`;
  }

  const repo = await git.repository(opts.cwd, pkg);

  // Remove some of the extras that don't make sense here
  delete pkg.gitHead;
  delete pkg.readme;
  delete pkg._id;

  // Set defaults from the package.json
  options.defaults({
    version: pkg.version,
    name: pkg.name,
    type: pkg.type,
    main: pkg.main,
    author,
    description: pkg.description,
    repository: repo,
    keywords: pkg.keywords,
    scripts: pkg.scripts,
    license: pkg.license
  });

  return packageInstance.update(pkg);
}

module.exports.format = format;
async function format (opts, packageInstance) {
  const pkg = packageInstance.content;
  // The order here matters
  pkg.name = opts.name;
  pkg.version = opts.version;
  pkg.description = opts.description || '';
  pkg.main = opts.main;
  pkg.type = opts.type || 'commonjs';

  // TODO: extra parsing going on here due to wesleytodd/opta#1
  pkg.keywords = uniquify([...(pkg.keywords || []), ...parseList(opts.keywords || [])]);

  // Scripts
  if (Object.keys(opts.scripts).length) {
    pkg.scripts = { ...(pkg.scripts || {}), ...opts.scripts };
  }

  // Workspaces
  if (Array.isArray(opts.workspaces) && opts.workspaces.length) {
    pkg.workspaces = opts.workspaces;
  }

  // TODO: to test the empty string, we need to stub git.author()
  pkg.author = opts.author || '';
  pkg.license = opts.license;

  if (opts.repository) {
    if (typeof opts.repository === 'string') {
      pkg.repository = {
        type: 'git',
        url: opts.repository
      };
    } else {
      pkg.repository = opts.repository;
    }
  }

  if (opts.private === true) {
    pkg.private = true;
  }

  if (opts.man && opts.man.length) {
    pkg.man = Array.isArray(opts.man) && !opts.man[1] ? opts.man[0] : opts.man;
  }

  // Format peer deps
  if (opts.peerDependencies && opts.peerDependencies.length) {
    pkg.peerDependencies = {};

    await Promise.all(opts.peerDependencies.map(async (name) => {
      // @TODO we should align peer deps with the associated
      // devDep or prodDep semver range
      const spec = await npm.normalizePackageName(name);
      let ver;
      switch (spec.type) {
        case 'range':
        case 'version':
          ver = spec.fetchSpec;
          break;
        default:
          ver = '*';
      }
      pkg.peerDependencies[spec.name] = ver;
    }));
  }
  return packageInstance.update(pkg);
}

module.exports.write = write;
// TODO: look at https://npm.im/json-file-plus for writing
async function write (opts, pkg, { log } = {}) {
  const pkgPath = path.resolve(opts.cwd, 'package.json');
  // Write package json
  log.info(`Writing package.json\n${pkgPath}`);
  await pkg.save();

  // Run installs
  if (opts.dependencies && opts.dependencies.length) {
    log.info('Installing dependencies', opts.dependencies);
    await npm.install(opts.dependencies, {
      save: 'prod',
      directory: opts.cwd,
      exact: !!opts.saveExact
    });
  }
  if (opts.devDependencies && opts.devDependencies.length) {
    log.info('Installing dev dependencies', opts.devDependencies);
    await npm.install(opts.devDependencies, {
      save: 'dev',
      directory: opts.cwd,
      exact: !!opts.saveExact
    });
  }

  // Read full package back to return
  return fs.readJSON(pkgPath);
}

function uniquify (arr = []) {
  return [...new Set(arr)];
}
