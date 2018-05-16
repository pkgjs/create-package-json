'use strict'
// vim: set ft=javascript ts=2 sw=2:
const inquirer = require('inquirer')
const validatePackageName = require('validate-npm-package-name')
const arrayFromList = require('./array-from-list')
const arrayOrUndefined = require('./array-or-undefined')

module.exports = async function prompt (opts = {}, options = {}) {
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
    default: opts.description,
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
    message: 'Keywords (ex: blockchain, ninja):',
    default: arrayOrUndefined(opts.keywords),
    when: !options.keywords,
    filter: arrayFromList
  }, {
    name: 'license',
    message: 'License (ex: MIT, unlicensed):',
    default: opts.license,
    when: !options.license
  }, {
    name: 'main',
    message: 'Entry point (main):',
    default: opts.main,
    when: !options.main
  }, {
    name: 'dependencies',
    message: 'Dependencies (ex: express, react):',
    default: arrayOrUndefined(opts.dependencies),
    when: !options.dependencies,
    filter: arrayFromList,
    validate: validatePackageNames
  }, {
    name: 'devDependencies',
    message: 'Dev Dependencies (ex: mocha, webpack):',
    default: arrayOrUndefined(opts.devDependencies),
    when: !options.devDependencies,
    filter: arrayFromList,
    validate: validatePackageNames
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
    message: 'Prepare script (run before publish and on local install):',
    default: s.prepare,
    when: !options.scripts || !options.scripts.prepare
  }, {
    name: 'prepublushOnly',
    message: 'Pre publush script (run only before publish):',
    default: s.prepublushOnly || 'npm t',
    when: !options.scripts || !options.scripts.prepublushOnly
  }, {
    name: 'postpublish',
    message: 'Post publish script:',
    default: s.postpublish,
    when: !options.scripts || !options.scripts.postpublish
  }, {
    name: 'preversion',
    message: 'Pre version script:',
    default: s.postpublish,
    when: !options.scripts || !options.scripts.postpublish
  }])

  // Merge scripts and add any customs
  const scripts = await promptForCustomScript(Object.assign(s, commonScripts))

  // Remove empty scripts
  return Object.keys(scripts).reduce((s, key) => {
    if (scripts[key]) {
      s[key] = scripts[key]
    }
    return s
  }, {})
}

async function promptForCustomScript (scripts = {}) {
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

  return promptForCustomScript(scripts)
}

function validatePackageNames (input) {
  const error = input.reduce((err, name) => {
    let v = validatePackageName(name)
    return err || (v.validForNewPackages || v.validForOldPackages ? true : ((v.errors && v.errors[0]) || `Invalid package name: ${name}`))
  }, null)
  return error || true
}
