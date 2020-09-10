'use strict'
const path = require('path')
const assert = require('assert')
// const fs = require('fs-extra')
const { suite, test, before } = require('mocha')
const fixtures = require('fs-test-fixtures')
const createPackageJson = require('../')

const barePrompt = {
  promptor: () => async (prompts) => {
    // Set defaults from prompts
    const out = await Promise.all(prompts.map(async (p) => {
      if (!p.when) {
        return []
      }
      let ret = typeof p.default === 'function' ? p.default({}) : p.default
      if (ret && typeof ret.then === 'function') {
        ret = await ret
      }
      return [p.name, ret]
    }))
    return Object.fromEntries(out)
  }
}

suite.only('create-git', () => {
  let fix
  before(() => {
    fix = fixtures()
  })

  test('create a new default package.json', async () => {
    await fix.setup()
    const pkg = await createPackageJson({
      cwd: fix.TMP,
      author: 'Test User <fake@user.com>'
    }, {
      promptor: () => {
        return async (prompts) => {
          assert.strictEqual(prompts[0].name, 'name')
          assert.strictEqual(prompts[1].name, 'version')
          assert.strictEqual(prompts[2].name, 'description')
          assert.strictEqual(prompts[3].name, 'author')
          assert.strictEqual(prompts[4].name, 'repository')
          assert.strictEqual(prompts[5].name, 'keywords')
          assert.strictEqual(prompts[6].name, 'license')
          assert.strictEqual(prompts[7].name, 'type')
          assert.strictEqual(prompts[8].name, 'main')
          assert.strictEqual(prompts[9].name, 'dependencies')
          assert.strictEqual(prompts[10].name, 'devDependencies')

          // Set defaults from prompts
          const out = await Promise.all(prompts.map(async (p) => {
            if (!p.when) {
              return []
            }
            let ret = typeof p.default === 'function' ? p.default({}) : p.default
            if (ret && typeof ret.then === 'function') {
              ret = await ret
            }
            return [p.name, ret]
          }))
          return Object.fromEntries(out)
        }
      }
    })

    assert.strictEqual(pkg.name, 'tmp')
    assert.strictEqual(pkg.version, '1.0.0')
    assert.strictEqual(pkg.description, '')
    assert.strictEqual(pkg.author, 'Test User <fake@user.com>')
    assert.strictEqual(pkg.repository, undefined)
    assert.strictEqual(pkg.keywords, undefined)
    assert.strictEqual(pkg.license, 'ISC')
    assert.strictEqual(pkg.type, 'commonjs')
    assert.strictEqual(pkg.main, 'index.js')
  })

  test('load from existing package.json', async () => {
    await fix.setup('existing')
    const pkg = await createPackageJson({
      cwd: fix.TMP
    }, barePrompt)

    assert.strictEqual(pkg.name, '@test/existing')
  })

  test('scoped package names', async () => {
    // Derive from directories
    await fix.setup('scope')
    const pkg1 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped')
    }, barePrompt)
    assert.strictEqual(pkg1.name, '@test/scoped')

    // Pass non-scoped name
    await fix.setup('scope')
    const pkg2 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped'),
      name: 'foo'
    }, barePrompt)
    assert.strictEqual(pkg2.name, 'foo')

    // scoped name
    await fix.setup('scope')
    const pkg3 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped'),
      name: '@other/foo'
    }, barePrompt)
    assert.strictEqual(pkg3.name, '@other/foo')

    // Load from existing package.json
    const pkg5 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped')
    }, barePrompt)
    assert.strictEqual(pkg5.name, '@other/foo')
  })
})
