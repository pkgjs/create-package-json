'use strict'
const path = require('path')
const npa = require('npm-package-arg')

module.exports = function scopeAndName (_name, cwd) {
  let name = _name
  if (!name) {
    const baseName = path.basename(cwd)
    const scope = path.basename(path.dirname(cwd))
    if (scope.startsWith('@')) {
      name = `${scope}/${baseName}`
    } else {
      name = baseName
    }
  }
  return npa(name).name
}
