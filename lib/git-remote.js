'use strict'
// vim: set ft=javascript ts=2 sw=2:
const path = require('path')
const fs = require('fs-extra')

module.exports = function gitRemote (dir) {
  // Taken from npm: https://github.com/npm/init-package-json/blob/latest/default-input.js#L188-L208
  return new Promise((resolve) => {
    fs.readFile(path.join(dir, '.git', 'config'), 'utf8', function (err, conf) {
      if (err || !conf) {
        return resolve()
      }
      conf = conf.split(/\r?\n/)
      const i = conf.indexOf('[remote "origin"]')
      let u
      if (i !== -1) {
        // Check if one of the next two lines is the remote url
        u = conf[i + 1]
        if (!u.match(/^\s*url =/)) {
          u = conf[i + 2]
        }
        if (!u.match(/^\s*url =/)) {
          u = null
        } else {
          u = u.replace(/^\s*url = /, '')
        }
      }

      // Replace github url
      if (u && u.match(/^git@github.com:/)) {
        u = u.replace(/^git@github.com:/, 'https://github.com/')
      }

      resolve(u)
    })
  })
}
