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
  // Removed undefined values from input
  const options = Object.keys(input).reduce((o, key) => {
    if (typeof input[key] !== 'undefined') {
      o[key] = input[key]
    }
    return o
  }, {})

  // Option defaults
  let opts = Object.assign({
    spacer: 2,
    directory: process.cwd(),
    ignoreExisting: false,
    noPrompt: false,
    silent: false
  }, options)

  // Read existing package.json
  opts.pkgPath = path.join(opts.directory, 'package.json')
  let pkg = {}
  if (opts.ignoreExisting === true) {
    try {
      pkg = await fs.readJSON(opts.pkgPath)
    } catch (e) {
      // ignore if missing or unreadable
    }
  }

  // Construct all the options from the input
  // Set things from opts, package.json or defaults
  opts.version = opts.version || pkg.version || '1.0.0'
  opts.description = opts.description || pkg.description || ''
  opts.author = opts.author || pkg.author || await getAuthor()
  opts.repository = opts.repository || (pkg.repository && pkg.repository.url) || await readGitRemote(opts.directory)
  opts.keywords = arrayOrUndefined(opts.keywords) || pkg.keywords || []
  opts.license = opts.license || pkg.license || 'ISC'
  opts.main = opts.main || pkg.main || 'index.js'
  opts.private = defined(opts.private, pkg.private)
  opts.dependencies = mapDepToVersionString(arrayOrUndefined(opts.dependencies) || pkg.dependencies || [])
  opts.devDependencies = mapDepToVersionString(arrayOrUndefined(opts.devDependencies) || pkg.devDependencies || [])

  // Merge together scripts from opts and package.json
  opts.scripts = Object.assign({}, opts.scripts || {}, pkg.scripts || {})

  // Get name and scope, if not from options from cwd
  const {name, scope} = getScopeAndName(opts.scope, opts.name || pkg.name, opts.directory)
  opts.name = name
  opts.scope = scope

  // Merge it back together and write it out
  return write((opts.noPrompt === true) ? opts : await prompt(opts, options), format(opts, pkg))
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
