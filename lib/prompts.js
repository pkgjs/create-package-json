'use strict'
// vim: set ft=javascript ts=2 sw=2:
const path = require('path')
const inquirer = require('inquirer')
const validatePackageName = require('validate-npm-package-name')
const realizePackageSpecifier = require('realize-package-specifier')
const arrayFromList = require('./array-from-list')
const arrayOrUndefined = require('./array-or-undefined')

module.exports = async function prompt (opts = {}, options = {}) {
  if (opts.noPrompt === true) {
    return opts
  }

  const answers = await inquirer.prompt([{
    name: 'name',
    message: 'Package name:',
    default: opts.name,
    when: !options.name
  }, {
    name: 'scope',
    message: 'Package scope:',
    default: opts.scope,
    when: !options.scope
  }, {
    name: 'version',
    message: 'Version:',
    default: opts.version,
    when: !options.version
  }, {
    name: 'description',
    message: 'Description:',
    // This is because inquirer treats an empty string as truthy and shows ()
    default: opts.description ? opts.description : undefined,
    when: !options.description
  }, {
    name: 'author',
    message: 'Author:',
    default: opts.author,
    when: !options.author
  }, {
    name: 'repository',
    message: 'Repository:',
    default: opts.repository,
    when: !options.repository
  }, {
    name: 'keywords',
    message: 'Keywords [ex: blockchain, ninja]:',
    default: arrayOrUndefined(opts.keywords),
    when: !options.keywords,
    filter: arrayFromList
  }, {
    name: 'license',
    message: 'License [ex: MIT, unlicensed]:',
    default: opts.license,
    when: !options.license
  }, {
    name: 'main',
    message: 'Entry point:',
    default: opts.main,
    when: !options.main
  }, {
    name: 'dependencies',
    message: 'Dependencies [ex: express, react]:',
    default: arrayOrUndefined(opts.dependencies),
    when: !options.dependencies,
    filter: arrayFromList,
    validate: validatePackageNames
  }, {
    name: 'devDependencies',
    message: 'Dev Dependencies [ex: mocha, webpack]:',
    default: arrayOrUndefined(opts.devDependencies),
    when: !options.devDependencies,
    filter: arrayFromList,
    validate: validatePackageNames
  }, {
    name: 'private',
    type: 'confirm',
    message: 'Is this package private?',
    default: !!opts.private,
    when: opts.extended && typeof options.private === 'undefined'
  }, {
    name: 'man',
    message: 'Man Pages:',
    default: opts.man,
    when: opts.extended && !options.man,
    filter: arrayFromList
  }])

  // Get custom scripts
  answers.scripts = await promptForScripts(opts, options)

  // Merge answers into opts
  return Object.assign({}, opts, answers)
}

async function promptForScripts (opts = {}, options = {}) {
  const s = opts.scripts || options.scripts || {}

  const commonScripts = await inquirer.prompt([{
    name: 'test',
    message: 'Test script:',
    default: s.test || 'echo "Error: no test specified" && exit 1',
    when: !options.scripts || !options.scripts.test
  }, {
    name: 'prepare',
    message: 'Prepare script [run before publish and on local install]:',
    default: s.prepare,
    when: opts.extended && (!options.scripts || !options.scripts.prepare)
  }, {
    name: 'prepublushOnly',
    message: 'Pre publush script [run only before publish]:',
    default: s.prepublushOnly || 'npm t',
    when: !options.scripts || !options.scripts.prepublushOnly
  }, {
    name: 'postpublish',
    message: 'Post publish script:',
    default: s.postpublish,
    when: opts.extended && (!options.scripts || !options.scripts.postpublish)
  }, {
    name: 'preversion',
    message: 'Pre version script:',
    default: s.preversion,
    when: opts.extended && (!options.scripts || !options.scripts.preversion)
  }])

  // Merge scripts and add any customs
  const scripts = await promptForCustomScript(opts, Object.assign(s, commonScripts))

  // Remove empty scripts
  return Object.keys(scripts).reduce((s, key) => {
    if (scripts[key]) {
      s[key] = scripts[key]
    }
    return s
  }, {})
}

async function promptForCustomScript (opts = {}, scripts = {}) {
  if (!opts.extended) {
    return scripts
  }

  const {another} = await inquirer.prompt([{
    name: 'another',
    message: 'Add another script?',
    type: 'confirm',
    default: false
  }])

  if (!another) {
    return scripts
  }

  const script = await inquirer.prompt([{
    name: 'name',
    message: 'Script name:'
  }, {
    name: 'content',
    message: 'Script content:'
  }])

  scripts[script.name] = script.content

  return promptForCustomScript(opts, scripts)
}

async function validatePackageNames (input) {
  if (!input) {
    return true
  }

  let valid = true
  for (let i = 0; i < input.length && valid === true; i++) {
    let pkg
    try {
      pkg = await realizePkgSpec(input[i])
    } catch (e) {
      return e
    }

    switch (pkg.type) {
      // Directory checkes for package.json and
      // hosted means it looks like a remote repo or tarball
      case 'directory':
      case 'hosted':
        return true
      case 'local':
        // check for something that looks like a path
        // because any random string is marked as local
        if (pkg.raw.includes('.') || pkg.raw.includes(path.sep)) {
          continue
        }
    }

    // Manual check because the validate package just says "name cannot be null"
    if (!pkg.name) {
      return new Error('Invalid package name: ' + pkg.raw)
    }

    let v = validatePackageName(pkg.name)
    valid = v.validForNewPackages || v.validForOldPackages ? true : ((v.errors && v.errors[0]) || `Invalid package name: ${input[i]}`)
  }
  return valid
}

function realizePkgSpec (name) {
  return new Promise((resolve, reject) => {
    realizePackageSpecifier(name, (err, pkg) => {
      if (err) {
        return reject(err)
      }
      resolve(pkg)
    })
  })
}
