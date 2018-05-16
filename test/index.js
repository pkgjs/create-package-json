'use strict'
// vim: set ft=javascript ts=2 sw=2:
const path = require('path')
const assert = require('assert')
const {describe, it, beforeEach} = require('mocha')
const fs = require('fs-extra')
const createPackageJson = require('../')

const TMP_DIR = path.join(__dirname, 'fixtures', 'tmp')

describe('create package json', () => {
  beforeEach(() => fs.remove(TMP_DIR))

  it('should create a bare bones package.json', async function () {
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      noPrompt: true,
      silent: true
    })

    assert.equal(pkg.name, path.basename(TMP_DIR))
    assert.equal(pkg.version, '1.0.0')
    assert(pkg.author)
    assert.equal(pkg.license, 'ISC')
  })

  it('should create a full package.json', async function () {
    // 60s seems more than reasonable
    this.timeout(60 * 1000)

    const pkg = await createPackageJson({
      directory: TMP_DIR,
      noPrompt: true,
      silent: true,

      name: 'test-package',
      version: '0.0.1',
      description: 'a test package',
      main: './lib/index.js',
      author: 'Test User <test@example.com>',
      repository: 'https://github.com/foo/bar.git',
      keywords: ['foo', 'bar'],
      license: 'MIT',
      dependencies: ['nighthawk'],
      devDependencies: ['standard', 'mocha']
    })

    assert.equal(pkg.name, 'test-package')
    assert.equal(pkg.version, '0.0.1')
    assert.equal(pkg.description, 'a test package')
    assert.equal(pkg.main, './lib/index.js')
    assert.equal(pkg.author, 'Test User <test@example.com>')
    assert.equal(pkg.repository.url, 'https://github.com/foo/bar.git')
    assert(pkg.keywords.includes('foo'))
    assert(pkg.keywords.includes('bar'))
    assert.equal(pkg.license, 'MIT')
    assert(pkg.dependencies.nighthawk)
    assert(pkg.devDependencies.standard)
    assert(pkg.devDependencies.mocha)
  })
})
