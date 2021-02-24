'use strict'
const npa = require('npm-package-arg')
const nameFromFolder = require('@npmcli/name-from-folder')

module.exports = function scopeAndName (_name, _scope, cwd) {
  let name = _name
  const scope = _scope
  if (!name) {
    name = nameFromFolder(cwd)
  }
  if (scope) {
    if (name.startsWith('@')) {
      const [, n] = name.split('/')
      name = n
    }
    name = `${scope}/${name}`
  }
  return npa(name).name
}
