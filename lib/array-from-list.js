'use strict'
// vim: set ft=javascript:ts=2:sw=2:

module.exports = function arrayFromList (list) {
  let arr = list || []
  if (typeof list === 'string') {
    arr = list.split(/\s*,\s*/g)
  }
  return arr.reduce((a, item) => {
    if (item !== '') {
      a.push(item)
    }
    return a
  }, [])
}
