'use strict'
const path = require('path')
const assert = require('assert')
const { suite, test } = require('mocha')
const fs = require('fs-extra')
const createPackageJson = require('../')
const git = require('../lib/git')

const FIX_DIR = path.join(__dirname, 'fixtures')
const TMP_DIR = path.join(FIX_DIR, 'tmp')
async function setupFixture (name) {
  await fs.remove(TMP_DIR)
  if (name) {
    await fs.copy(path.join(FIX_DIR, name), TMP_DIR)
  }
}

suite('create-package-json', () => {
  test('basic package.json', async function () {
    await setupFixture()

    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true
    })

    assert.deepStrictEqual(pkg, {
      name: path.basename(TMP_DIR),
      version: '1.0.0',
      description: '',
      main: 'index.js',
      type: 'commonjs',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      author: await git.author() || '',
      license: 'ISC'
    })
  })

  test('load existing package.json', async function () {
    await setupFixture('existing')

    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true
    })

    assert.deepStrictEqual(pkg, {
      name: '@test/existing',
      version: '0.0.0',
      description: 'A test package',
      main: 'index.js',
      type: 'commonjs',
      scripts: {
        test: 'exit 0'
      },
      author: 'Test <tester@example.com>',
      license: 'ISC'
    })

    const pkg2 = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      ignoreExisting: true
    })
    assert.deepStrictEqual(pkg2, {
      name: path.basename(TMP_DIR),
      version: '1.0.0',
      description: '',
      main: 'index.js',
      type: 'commonjs',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      author: await git.author() || '',
      license: 'ISC'
    })
  })

  test('scoped package names', async () => {
    // Derive from directories
    await setupFixture('scope')
    const pkg1 = await createPackageJson({
      directory: path.join(TMP_DIR, '@test', 'scoped'),
      prompt: false,
      silent: true
    })
    assert.strictEqual(pkg1.name, '@test/scoped')

    // No scope, derive from dir
    await setupFixture('scope')
    const pkg2 = await createPackageJson({
      directory: path.join(TMP_DIR, '@test', 'scoped'),
      prompt: false,
      silent: true,
      name: 'foo'
    })
    assert.strictEqual(pkg2.name, '@test/foo')

    // scope in name
    await setupFixture('scope')
    const pkg3 = await createPackageJson({
      directory: path.join(TMP_DIR, '@test', 'scoped'),
      prompt: false,
      silent: true,
      name: '@other/foo'
    })
    assert.strictEqual(pkg3.name, '@other/foo')

    // seprate scope and name
    await setupFixture('scope')
    const pkg4 = await createPackageJson({
      directory: path.join(TMP_DIR, '@test', 'scoped'),
      prompt: false,
      silent: true,
      scope: 'scope',
      name: 'foo'
    })
    assert.strictEqual(pkg4.name, '@scope/foo')

    // Load from existing package.json
    const pkg5 = await createPackageJson({
      directory: path.join(TMP_DIR, '@test', 'scoped'),
      prompt: false,
      silent: true
    })
    assert.strictEqual(pkg5.name, '@scope/foo')

    // override name from existing
    const pkg6 = await createPackageJson({
      directory: path.join(TMP_DIR, '@test', 'scoped'),
      prompt: false,
      silent: true,
      name: 'bar'
    })
    assert.strictEqual(pkg6.name, '@test/bar')

    // override name and scope from existing
    const pkg7 = await createPackageJson({
      directory: path.join(TMP_DIR, '@test', 'scoped'),
      prompt: false,
      silent: true,
      name: '@other/baz'
    })
    assert.strictEqual(pkg7.name, '@other/baz')
  })

  test('version', async function () {
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      version: '2.0.0'
    })
    assert.strictEqual(pkg.version, '2.0.0')
  })

  test('type', async function () {
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true
    })
    assert.strictEqual(pkg.type, 'commonjs')

    await setupFixture()
    const pkg2 = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      type: 'module'
    })
    assert.strictEqual(pkg2.type, 'module')

    const pkg3 = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true
    })
    assert.strictEqual(pkg3.type, 'module')
  })

  test('description', async function () {
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      description: 'test desc'
    })
    assert.strictEqual(pkg.description, 'test desc')
  })

  test('repository', async function () {
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      repository: 'https://github.com/foo/bar.git'
    })
    assert.strictEqual(pkg.repository.type, 'git')
    assert.strictEqual(pkg.repository.url, 'https://github.com/foo/bar.git')

    await setupFixture()
    // Cannot use a fixture for this beause git refuses
    // to add a .git directory
    await fs.outputFile(path.join(TMP_DIR, '.git', 'config'), `
[remote "origin"]
  url = git@github.com:wesleytodd/create-package-json.git
  fetch = +refs/heads/*:refs/remotes/origin/*`)

    const pkg2 = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true
    })
    assert.strictEqual(pkg2.repository.type, 'git')
    assert.strictEqual(pkg2.repository.url, 'https://github.com/wesleytodd/create-package-json.git')
  })

  test('keywords', async function () {
    await setupFixture()

    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      keywords: 'foo,   bar, baz,,box'
    })
    assert.deepStrictEqual(pkg.keywords, ['foo', 'bar', 'baz', 'box'])

    const pkg2 = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      keywords: ['foo', 'bar', 'baz', 'box']
    })
    assert.deepStrictEqual(pkg2.keywords, ['foo', 'bar', 'baz', 'box'])
  })

  test('main', async function () {
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      main: 'lib/index.js'
    })
    assert.strictEqual(pkg.main, 'lib/index.js')
  })

  test('private', async function () {
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      private: true
    })
    assert.strictEqual(pkg.private, true)
  })

  test('license', async function () {
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      license: 'MIT'
    })
    assert.strictEqual(pkg.license, 'MIT')
  })

  test('scripts', async function () {
    await setupFixture('existing')
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      scripts: {
        test: 'exit 1',
        prepare: 'npm t',
        preversion: 'npm t',
        postpublish: 'git push'
      }
    })
    assert.strictEqual(pkg.scripts.test, 'exit 1')
    assert.strictEqual(pkg.scripts.prepare, 'npm t')
    assert.strictEqual(pkg.scripts.preversion, 'npm t')
    assert.strictEqual(pkg.scripts.postpublish, 'git push')
  })

  test('dependencies', async function () {
    this.timeout(60 * 1000)
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      dependencies: '@pkgjs/create@0.1.0,safe-parse-list@0.1.0'
    })
    assert.strictEqual(pkg.dependencies['@pkgjs/create'], '^0.1.0')
    assert.strictEqual(pkg.dependencies['safe-parse-list'], '^0.1.0')

    // Save exact
    const pkg2 = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      dependencies: '@pkgjs/create@0.0.1,safe-parse-list@0.0.1',
      saveExact: true
    })
    assert.strictEqual(pkg2.dependencies['@pkgjs/create'], '0.0.1')
    assert.strictEqual(pkg2.dependencies['safe-parse-list'], '0.0.1')
  })

  test('devDependencies', async function () {
    this.timeout(60 * 1000)
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      devDependencies: '@pkgjs/create@0.1.0,safe-parse-list@0.1.0'
    })
    assert.strictEqual(pkg.devDependencies['@pkgjs/create'], '^0.1.0')
    assert.strictEqual(pkg.devDependencies['safe-parse-list'], '^0.1.0')
  })

  test('peerDependencies', async function () {
    this.timeout(60 * 1000)
    await setupFixture()
    const pkg = await createPackageJson({
      directory: TMP_DIR,
      prompt: false,
      silent: true,
      peerDependencies: '@pkgjs/create,safe-parse-list@<1'
    })
    assert.strictEqual(pkg.peerDependencies['@pkgjs/create'], '*')
    assert.strictEqual(pkg.peerDependencies['safe-parse-list'], '<1')
  })
})
