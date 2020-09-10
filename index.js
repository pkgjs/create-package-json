'use strict'
const path = require('path')
const fs = require('fs-extra')
const opta = require('opta')
const parseList = require('safe-parse-list')
const packageName = require('./lib/package-name')
const git = require('./lib/git')
const npm = require('./lib/npm')

function initOpts () {
  return opta({
    commandDescription: 'Generate a package.json',
    options: {
      cwd: {
        description: 'Directory to run in',
        prompt: false,
        flag: {
          alias: 'd',
          defaultDescription: 'process.cwd()',
          default: () => process.cwd()
        }
      },

      ignoreExisting: {
        description: 'Ignore existing files (& overwrite them)',
        prompt: false,
        flag: {
          key: 'ignore-existing',
          defaultDescription: 'false'
        }
      },

      name: {
        type: 'string',
        prompt: {
          message: 'Package name:',
          validate: npm.validatePackageName,
          default: (promptInput, allInput) => {
            return packageName(allInput.name, allInput.cwd)
          }
        }
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
            return allInput.version || '1.0.0'
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
            return allInput.author || git.author({ cwd: allInput.cwd })
          }
        }
      },
      repository: {
        type: 'string',
        prompt: {
          message: 'Repository:',
          default: (promptInput, allInput) => {
            return allInput.repository || git.remote({ cwd: allInput.cwd })
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

      type: {
        type: 'string',
        prompt: {
          message: 'Module Type:',
          type: 'list',
          choices: ['commonjs', 'module'],
          default: (promptInput, allInput) => {
            return allInput.type || 'commonjs'
          }
        }
      },
      main: {
        type: 'string',
        prompt: {
          message: 'Main:',
          default: (promptInput, allInput) => {
            return allInput.main || 'index.js'
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
        advanced: true,
        type: 'string',
        flag: {
          key: 'peer-dependencies'
        },
        prompt: false
      },

      // @TODO detect from existing file
      spacer: {
        type: 'string',
        default: '  ',
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
  })
}

module.exports = main
async function main (input, _opts = {}) {
  const options = initOpts()
  options.overrides({
    ...input,
    cwd: input.cwd || process.cwd()
  })
  let opts = options.values()

  // Read current state and set defaults
  const pkg = opts.ignoreExisting ? {} : await readPackageJson(options)

  await options.prompt({
    promptor: _opts.promptor
  })()

  opts = options.values()
  return write(path.resolve(opts.cwd, 'package.json'), opts, await format(opts, pkg))
}

module.exports.options = initOpts().options
module.exports.cli = function () {
  return initOpts().cli((yargs) => {
    yargs.command('$0', 'Generate a package.json', () => {}, main)
  })
}

module.exports.readPackageJson = readPackageJson
async function readPackageJson (options) {
  const opts = options.values()
  let pkg = {}
  try {
    pkg = await fs.readJSON(path.resolve(opts.cwd, 'package.json'))
  } catch (e) {
    // @TODO log this?
    // ignore if missing or unreadable
  }

  // Set defaults from the package.json
  options.defaults({
    version: pkg.version,
    name: pkg.name,
    type: pkg.type,
    author: pkg.author,
    description: pkg.description,
    repository: pkg.repository && pkg.repository.url,
    keywords: pkg.keywords
  })

  return pkg
}

module.exports.format = format
async function format (opts, pkg = {}) {
  // The order here matters
  pkg.name = opts.name
  pkg.version = opts.version
  pkg.description = opts.description || ''
  pkg.main = opts.main
  pkg.type = opts.type || 'commonjs'

  if (opts.keywords && opts.keywords.length) {
    pkg.keywords = opts.keywords
  }

  // Scripts
  // pkg.scripts = Object.assign({}, {
  //   test: opts.scriptsTest,
  //   prepare: opts.scriptsPrepare,
  //   preversion: opts.scriptsPreVersion,
  //   postpublish: opts.scriptsPostPublish
  // }, opts.scripts)

  pkg.author = opts.author || ''
  pkg.license = opts.license

  if (opts.repository) {
    pkg.repository = {
      type: 'git',
      url: opts.repository
    }
  }

  if (opts.private === true) {
    pkg.private = true
  }

  if (opts.man && opts.man.length) {
    pkg.man = Array.isArray(opts.man) && !opts.man[1] ? opts.man[0] : opts.man
  }

  // Format peer deps
  if (opts.peerDependencies && opts.peerDependencies.length) {
    pkg.peerDependencies = {}

    await Promise.all(opts.peerDependencies.map(async (name) => {
      const spec = await npm.normalizePackageName(name)
      let ver
      switch (spec.type) {
        case 'range':
        case 'version':
          ver = spec.fetchSpec
          break
        default:
          ver = '*'
      }
      pkg.peerDependencies[spec.name] = ver
    }))
  }
  return pkg
}

module.exports.write = write
async function write (pkgPath, opts, pkg) {
  // Write package json
  await fs.outputJSON(pkgPath, pkg, {
    spaces: opts.spacer || 2
  })

  // Run installs
  await npm.install(opts.dependencies, {
    save: 'prod',
    directory: opts.cwd,
    exact: opts.saveExact
  })
  await npm.install(opts.devDependencies, {
    save: 'dev',
    directory: opts.cwd,
    exact: opts.saveExact
  })

  // Read full package back to return
  return fs.readJSON(pkgPath)
}
