'use strict'
// vim: set ft=javascript ts=2 sw=2:
const path = require('path')

module.exports = function scopeAndName (scope, name, cwd) {
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
