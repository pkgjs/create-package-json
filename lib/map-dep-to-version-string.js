'use strict'
// vim: set ft=javascript ts=2 sw=2:

module.exports = function mapDepToVersionString (deps) {
  return Array.isArray(deps) ? deps : Object.keys(deps).map((name) => `${name}@${deps[name]}`)
}
