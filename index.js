'use strict'
const create = require('@pkgjs/create')
const fs = require('fs-extra')
const path = require('path')
const parseList = require('safe-parse-list')
const scopeAndName = require('./lib/scope-and-name')
const npm = require('./lib/npm')
const git = require('./lib/git')

// @TODO https://docs.npmjs.com/files/package.json
// exports
// bin
// funding
// files
// browser
// directories
// config
// bundledDependencies
// optionalDependencies
// engines
// os
// cpu
// publishConfig
// homepage
// bugs
// contributors

module.exports = create({
  commandDescription: 'Create a package.json',
  options: {
    // No prompts, just flags
    pkgPath: {
      type: 'string',
      flag: {
        key: 'existing-package'
      },
      prompt: false
    },
    scope: {
      type: 'string',
      prompt: false
    },
    scripts: {
      type: 'string',
      prompt: false
    },

    name: {
      type: 'string',
      prompt: {
        message: 'Package name:',
        validate: npm.validatePackageName
      }
    },
    version: {
      type: 'string',
      flag: {
        key: 'package-version'
      },
      prompt: {
        message: 'Version:'
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
        message: 'Author:'
      }
    },
    repository: {
      type: 'string',
      prompt: {
        message: 'Repository:'
      }
    },
    keywords: {
      type: 'string',
      prompt: {
        message: 'Keywords:',
        filter: parseList
      }
    },
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
        choices: ['commonjs', 'module']
      }
    },
    main: {
      type: 'string',
      default: 'index.js',
      prompt: {
        message: 'Main:'
      }
    },
    private: {
      advanced: true,
      type: 'boolean',
      prompt: {
        message: 'Private package:',
        default: false
      }
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
      prompt: {
        message: 'Peer Dependencies:',
        filter: parseList,
        validate: npm.validatePackageSpec
      }
    },

    // Common npm scripts
    scriptsTest: {
      type: 'string',
      flag: {
        key: 'test'
      },
      prompt: {
        message: 'Test script:'
      }
    },
    scriptsPrepare: {
      advanced: true,
      type: 'string',
      flag: {
        key: 'prepare'
      },
      prompt: {
        message: 'Prepare script:'
      }
    },
    scriptsPostPublish: {
      advanced: true,
      type: 'string',
      flag: {
        key: 'post-publish'
      },
      prompt: {
        message: 'Post publish script:'
      }
    },
    scriptsPreVersion: {
      advanced: true,
      type: 'string',
      flag: {
        key: 'pre-version'
      },
      prompt: {
        message: 'Pre version script:'
      }
    },

    // Meta prompts
    spacer: {
      advanced: true,
      type: 'string',
      default: '  ',
      flag: {
        key: 'spacer'
      },
      prompt: {
        message: 'JSON spacer character:'
      }
    },
    // @TODO should this exist? or should people just do
    // package@latest in their (dev)dependencies
    // updateDeps: {
    //   advanced: true,
    //   type: 'boolean',
    //   default: true,
    //   flag: {
    //     key: 'update-deps'
    //   },
    //   prompt: {
    //     message: 'Update dependencies:'
    //   }
    // },
    ignoreExisting: {
      advanced: true,
      type: 'boolean',
      default: false,
      prompt: false,
      flag: {
        key: 'ignore-existing'
      }
    },
    saveExact: {
      advanced: true,
      type: 'boolean',
      default: false,
      flag: {
        key: 'save-exact'
      },
      prompt: {
        message: 'Save exact versions:'
      }
    }
  }
}, async (initOpts, input) => {
  const directory = input.directory || process.cwd()
  const pkgPath = path.resolve(directory, input.pkgPath || 'package.json')

  // Read existing package.json
  const pkg = input.ignoreExisting ? {} : await readPackageJson(pkgPath)

  // Derive defaults from input and existing package.json
  const version = input.version || pkg.version || '1.0.0'
  const name = scopeAndName(input.scope, input.name || pkg.name, directory)
  const type = input.type || pkg.type || 'commonjs'
  const author = input.author || pkg.author || await git.author()
  const description = input.description || pkg.description
  const repository = input.repository || (pkg.repository && pkg.repository.url) || await git.remote(input)
  const keywords = parseList(input.keywords || pkg.keywords)

  // Dependencies
  const dependencies = parseList(input.dependencies)
  const devDependencies = parseList(input.devDependencies)
  const peerDependencies = parseList(input.peerDependencies)

  // Derive standard scripts
  const scriptsTest = input.scriptsTest || (pkg.scripts && pkg.scripts.test) || 'echo "Error: no test specified" && exit 1'
  const scriptsPrepare = input.scriptsPrepare || (pkg.scripts && pkg.scripts.prepare)
  const scriptsPreVersion = input.scriptsPreVersion || (pkg.scripts && pkg.scripts.preversion)
  const scriptsPostPublish = input.scriptsPostPublish || (pkg.scripts && pkg.scripts.postpublish)

  // Process options & prompt for input
  const opts = await initOpts({
    directory,
    version,
    name,
    type,
    description,
    author,
    repository,
    keywords,
    dependencies,
    devDependencies,
    peerDependencies,
    scriptsTest,
    scriptsPrepare,
    scriptsPreVersion,
    scriptsPostPublish
  })

  // Format the json and write it out
  return write(pkgPath, opts, await format(opts, pkg))
})

module.exports.readPackageJson = readPackageJson
async function readPackageJson (pkgPath, opts = {}) {
  let pkg = {}
  try {
    pkg = await fs.readJSON(pkgPath)
  } catch (e) {
    // @TODO log this?
    // ignore if missing or unreadable
  }
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
  pkg.scripts = Object.assign({}, {
    test: opts.scriptsTest,
    prepare: opts.scriptsPrepare,
    preversion: opts.scriptsPreVersion,
    postpublish: opts.scriptsPostPublish
  }, opts.scripts)

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
    directory: opts.directory,
    silent: opts.silent,
    exact: opts.saveExact
  })
  await npm.install(opts.devDependencies, {
    save: 'dev',
    directory: opts.directory,
    silent: opts.silent,
    exact: opts.saveExact
  })

  // Read full package back to return
  return fs.readJSON(pkgPath)
}
