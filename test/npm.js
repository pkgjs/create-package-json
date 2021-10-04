const assert = require('assert')
const { suite, test } = require('mocha')

const npm = require('../lib/npm')

suite('npm', () => {
  test('accept empty semver', () => {
    assert.doesNotThrow(() => npm.normalizePackageName('@pkgjs/create'))
  })
  test('accept valid semver', () => {
    assert.doesNotThrow(() => npm.normalizePackageName('@pkgjs/create@1.0.0'))
    assert.doesNotThrow(() => npm.normalizePackageName('@pkgjs/create@<1'))
  })
  test('accept valid semver (exceptions)', () => {
    assert.doesNotThrow(() => npm.normalizePackageName('@pkgjs/create@<=2'))
    assert.doesNotThrow(() => npm.normalizePackageName('@pkgjs/create@>=2'))
    assert.doesNotThrow(() => npm.normalizePackageName('@pkgjs/create@*'))
  })
  test('reject invalid semver', () => {
    assert.throws(() => npm.normalizePackageName('@pkgjs/create@a.b.c'))
  })
})
