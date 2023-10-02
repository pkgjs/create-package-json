'use strict'
const { promisify } = require('util')
const execFile = promisify(require('child_process').execFile)
const npa = require('npm-package-arg')
const validatePackageName = require('validate-npm-package-name')

// Remove npm env vars from the commands, this
// is so it respects the directory it is run in,
// otherwise this overrides things in .npmrc
const env = Object.keys(process.env).reduce((e, key) => {
  if (key.startsWith('npm_')) {
    return e
  }
  e[key] = process.env[key]
  return e
}, {})

module.exports.install = (deps = [], opts = {}) => {
  if (!deps || !deps.length) {
    return Promise.resolve()
  }

  let args = ['i']
  if (opts.save === false) {
    args.push('--no-save')
  } else {
    args.push(`--save-${opts.save || 'prod'}`)
    if (opts.exact) {
      args.push('--save-exact')
    }
    if (opts.bundle) {
      args.push('--save-bundle')
    }
  }
  args = args.concat(deps)

  return execFile('npm', args, {
    env,
    cwd: opts.directory || process.cwd()
  })
}

const packageTypes = ['tag', 'git', 'version', 'range', 'file', 'directory', 'remote']

module.exports.normalizePackageName = normalizePackageName
async function normalizePackageName (name, opts = {}) {
  const allowedTypes = opts.allowedTypes || packageTypes
  const pkg = npa(name)

  if (!allowedTypes.includes(pkg.type)) {
    // First try to validate the name incase npa miss categorized as a file/dir
    throw new Error(`Invalid package type specifier (${pkg.type} - ${pkg.raw})`)
  }

  switch (pkg.type) {
    // Directory checkes for package.json and
    // hosted means it looks like a remote repo or tarball
    case 'directory':
    case 'file':
    case 'remote':
    case 'git':
      // @TODO validate that it exists?
      break
    case 'tag':
    case 'version':
    case 'range':
      validName(pkg)
      break
  }

  return pkg
}

function validName (pkg) {
  // Manual check because the validate package just says "name cannot be null"
  if (!pkg.name) {
    throw new Error(`Invalid package name (${pkg.raw} - name cannot be empty)`)
  }

  const v = validatePackageName(pkg.name)
  if (v.errors || v.warnings) {
    const msg = (v.errors && v.errors[0]) || (v.warnings || v.warnings[0])
    throw new Error(`Invalid package name (${pkg.raw}${msg ? ` - ${msg}` : ''})`)
  }
}

module.exports.validatePackageNames = validatePackageSpec
function validatePackageSpec (name, opts = {}) {
  const names = Array.isArray(name) ? name : [name]
  for (let i = 0; i < names.length; i++) {
    try {
      normalizePackageName(names[i])
    } catch (e) {
      return e
    }
  }
  return true
}

module.exports.validatePackageName = async function (name) {
  try {
    await normalizePackageName(name, {
      allowedTypes: ['tag', 'range', 'version']
    })
  } catch (e) {
    return new Error(`${e.message}
>> This most likely indicates an invalid package name. See here:
>> https://www.npmjs.com/package/validate-npm-package-name#naming-rules`)
  }
  return true
}
