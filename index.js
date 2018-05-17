'use strict'
// vim: set ft=javascript ts=2 sw=2:
const path = require('path')
const fs = require('fs-extra')
const shell = require('shelljs')
const defined = require('defined')
const prompt = require('./lib/prompts')
const arrayOrUndefined = require('./lib/array-or-undefined')

// @TODO https://docs.npmjs.com/files/package.json
// man
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
    ignoreExisting: false,
    noPrompt: false,
    silent: false
  })

  // Read existing package.json
  const pkg = await readPackageJson(options)

  // Build up the package field options and merge it all together
  const opts = await buildPackageOptions(options, pkg)

  // Format the json and write it out
  return write(await prompt(opts, options), format(opts, pkg))
}

module.exports.readPackageJson = readPackageJson
async function readPackageJson (opts = {}) {
  let pkg = {}
  if (opts.ignoreExisting !== true) {
    try {
      pkg = await fs.readJSON(opts.pkgPath)
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
  opts.author = options.author || pkg.author || await getAuthor()
  opts.repository = options.repository || (pkg.repository && pkg.repository.url) || await readGitRemote(options.directory)
  opts.keywords = arrayOrUndefined(options.keywords) || pkg.keywords || []
  opts.license = options.license || pkg.license || 'ISC'
  opts.main = options.main || pkg.main || 'index.js'
  opts.private = defined(options.private, pkg.private)
  opts.dependencies = mapDepToVersionString(arrayOrUndefined(options.dependencies) || pkg.dependencies || [])
  opts.devDependencies = mapDepToVersionString(arrayOrUndefined(options.devDependencies) || pkg.devDependencies || [])

  // Merge together scripts from opts and package.json
  opts.scripts = Object.assign({}, options.scripts || {}, pkg.scripts || {})

  // Get name and scope, if not from options from cwd
  const {name, scope} = getScopeAndName(options.scope, options.name || pkg.name, options.directory)
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

//
// Helper Functions
//

function readGitRemote (dir) {
  // Taken from npm: https://github.com/npm/init-package-json/blob/latest/default-input.js#L188-L208
  return new Promise((resolve) => {
    fs.readFile(path.join(dir, '.git', 'config'), 'utf8', function (err, conf) {
      if (err || !conf) {
        return resolve()
      }
      conf = conf.split(/\r?\n/)
      const i = conf.indexOf('[remote "origin"]')
      let u
      if (i !== -1) {
        // Check if one of the next two lines is the remote url
        u = conf[i + 1]
        if (!u.match(/^\s*url =/)) {
          u = conf[i + 2]
        }
        if (!u.match(/^\s*url =/)) {
          u = null
        } else {
          u = u.replace(/^\s*url = /, '')
        }
      }

      // Replace github url
      if (u && u.match(/^git@github.com:/)) {
        u = u.replace(/^git@github.com:/, 'https://github.com/')
      }

      resolve(u)
    })
  })
}

function getAuthor () {
  const name = shell.exec('git config --get user.name', { silent: true }).stdout.trim()
  const email = shell.exec('git config --get user.email', { silent: true }).stdout.trim()
  if (!name) {
    return
  }
  return `${name} <${email}>`
}

function getScopeAndName (scope, name, cwd) {
  // If no package name, get cwd base name
  if (!name) {
    name = path.basename(cwd)
  }

  // If no scope, see if name has a scope in it
  if (!scope && name && name.startsWith('@')) {
    [scope, name] = name.split('/')
  }

  // If still no scope, see if one directory up starts with an @
  const dirname = path.basename(path.dirname(cwd))
  if (dirname.startsWith('@')) {
    scope = dirname
  }

  return { name, scope }
}

function mapDepToVersionString (deps) {
  return Array.isArray(deps) ? deps : Object.keys(deps).map((name) => `${name}@${deps[name]}`)
}
