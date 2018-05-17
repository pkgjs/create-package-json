'use strict'
// vim: set ft=javascript ts=2 sw=2:

module.exports = function arrayOrUndefined (prop) {
  return prop && prop.length ? prop : undefined
}
