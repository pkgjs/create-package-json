'use strict'
// vim: set ft=javascript ts=2 sw=2:
const path = require('path')
const fs = require('fs-extra')
const shell = require('shelljs')
const defined = require('defined')
const prompt = require('./lib/prompts')
const arrayOrUndefined = require('./lib/array-or-undefined')
const getAuthor = require('./lib/get-author')
const mapDepToVersionString = require('./lib/map-dep-to-version-string')
const scopeAndName = require('./lib/scope-and-name')
const gitRemote = require('./lib/git-remote')

// @TODO https://docs.npmjs.com/files/package.json
// bin
// files
// browser
// directories
// config
// peerDependencies
// bundledDependencies
// optionalDependencies
// engines
// engineStrict
// cpu
// publishConfig

module.exports = async function createPackageJson (input = {}) {
  // We need this for the defaults
  const cwd = process.cwd()

  // Removed undefined values from input and default some options
  const options = Object.keys(input).reduce((o, key) => {
    if (typeof input[key] !== 'undefined') {
      o[key] = input[key]
    }
    return o
  }, {
    spacer: 2,
    directory: cwd,
    pkgPath: path.join(input.directory || cwd, 'package.json'),
    updateDeps: true,
    ignoreExisting: false,
    noPrompt: false,
    silent: false,
    extended: false
  })

  // Read existing package.json
  const pkg = await readPackageJson(options)

  // Build up the package field options and merge it all together
  let opts = await buildPackageOptions(options, pkg)

  opts = await prompt(opts, options)

  // Merge peer deps into dev deps
  // opts.devDependencies = opts.devDependencies.concat(opts.peerDependencies || [])

  // Format the json and write it out
  return write(opts, format(opts, pkg))
}

module.exports.readPackageJson = readPackageJson
async function readPackageJson (opts = {}) {
  let pkg = {}
  if (opts.ignoreExisting !== true) {
    try {
      pkg = await fs.readJSON(opts.existingPackage || opts.pkgPath)
    } catch (e) {
      // ignore if missing or unreadable
    }
  }
  return pkg
}

module.exports.buildPackageOptions = buildPackageOptions
async function buildPackageOptions (options = {}, pkg = {}) {
  const opts = {}

  // Construct all the options from the input
  // Set things from opts, package.json or defaults
  opts.version = options.version || pkg.version || '1.0.0'
  opts.description = options.description || pkg.description || ''
  opts.author = options.author || pkg.author || getAuthor()
  opts.repository = options.repository || (pkg.repository && pkg.repository.url) || await gitRemote(options.directory)
  opts.keywords = arrayOrUndefined(options.keywords) || pkg.keywords || []
  opts.license = options.license || pkg.license || 'ISC'
  opts.main = options.main || pkg.main || 'index.js'
  opts.private = defined(options.private, pkg.private)
  opts.dependencies = mapDepToVersionString(arrayOrUndefined(options.dependencies) || pkg.dependencies || [], !opts.updateDeps)
  opts.devDependencies = mapDepToVersionString(arrayOrUndefined(options.devDependencies) || pkg.devDependencies || [], !opts.updateDeps)
  // opts.peerDependencies = mapDepToVersionString(arrayOrUndefined(options.peerDependencies) || pkg.peerDependencies || [])

  // Extended options
  opts.man = options.man || pkg.man

  // Merge together scripts from opts and package.json
  opts.scripts = Object.assign({}, options.scripts || {}, pkg.scripts || {})

  // Get name and scope, if not from options from cwd
  const {name, scope} = scopeAndName(options.scope, options.name || pkg.name, options.directory)
  opts.name = name
  opts.scope = scope

  return Object.assign({}, options, opts)
}

module.exports.format = format
function format (opts, pkg = {}) {
  pkg.name = opts.scope ? `${opts.scope}/${opts.name}` : opts.name
  pkg.version = opts.version
  pkg.description = opts.description
  pkg.author = opts.author
  pkg.keywords = opts.keywords
  pkg.license = opts.license
  pkg.main = opts.main
  if (opts.repository) {
    pkg.repository = {
      type: 'git',
      url: opts.repository
    }
  }
  pkg.scripts = opts.scripts
  if (opts.private === true) {
    pkg.private = true
  }
  if (opts.man && opts.man.length) {
    pkg.man = Array.isArray(opts.man) && !opts.man[1] ? opts.man[0] : opts.man
  }
  // @TODO ensure they are formatted correctly?
  // if (opts.peerDependencies) {
  //   pkg.peerDependencies = opts.peerDependencies
  // }
  return pkg
}

module.exports.write = write
async function write (opts, pkg) {
  // Write package json
  await fs.outputJSON(opts.pkgPath, pkg, {
    spaces: opts.spacer || 2
  })

  // Run installs
  if (opts.dependencies && opts.dependencies.length) {
    await shell.exec(`npm i --save ${opts.dependencies.join(' ')}`, {
      cwd: opts.directory,
      silent: opts.silent
    })
  }
  if (opts.devDependencies && opts.devDependencies.length) {
    await shell.exec(`npm i --save-dev ${opts.devDependencies.join(' ')}`, {
      cwd: opts.directory,
      silent: opts.silent
    })
  }

  // Read full package back to return
  return fs.readJSON(opts.pkgPath)
}
