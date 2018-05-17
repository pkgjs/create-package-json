'use strict'
// vim: set ft=javascript ts=2 sw=2:
const shell = require('shelljs')

module.exports = function getAuthor () {
  const name = shell.exec('git config --get user.name', { silent: true }).stdout.trim()
  const email = shell.exec('git config --get user.email', { silent: true }).stdout.trim()
  if (!name) {
    return
  }
  return `${name} <${email}>`
}
