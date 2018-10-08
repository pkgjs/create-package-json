'use strict'
// vim: set ft=javascript ts=2 sw=2:

module.exports = function mapDepToVersionString (deps, withVersion) {
  return Array.isArray(deps) ? deps : Object.keys(deps).map((name) => withVersion ? `${name}@${deps[name]}` : name)
}
