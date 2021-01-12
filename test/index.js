'use strict'
const path = require('path')
const assert = require('assert')
const { suite, test, before } = require('mocha')
const fixtures = require('fs-test-fixtures')
const createPkgJson = require('..')

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
    return out.reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
  }
}

suite('create-package-json', () => {
  let fix
  let createPackageJson

  before(() => {
    fix = fixtures()

    createPackageJson = async (opts, prompt = barePrompt) => {
      return createPkgJson({
        silent: true,
        cwd: fix.TMP ? fix.TMP : process.cwd(),
        ...opts
      }, prompt)
    }
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
          return out.reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
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
    assert.deepStrictEqual(pkg.scripts, { test: 'echo "Error: no test specified" && exit 1' })
  })

  test('ignore existing package.json', async () => {
    await fix.setup('ignore-existing')
    const pkg = await createPackageJson({
      ignoreExisting: true
    })

    assert.strictEqual(pkg.name, 'tmp')
  })

  suite('existing package.json overrides', () => {
    test('name', async () => {
      await fix.setup('overrides-name')
      const pkg = await createPackageJson()

      assert.strictEqual(pkg.name, '@test/existing')
    })

    test('repository', async () => {
      await fix.setup('overrides-repository')
      const pkg = await createPackageJson()

      assert.deepStrictEqual(pkg.repository, { type: 'git', url: 'https://git-landfill.com/garbage' })
    })

    test('repository (as string)', async () => {
      await fix.setup('overrides-repository-string')
      const pkg = await createPackageJson()

      assert.deepStrictEqual(pkg.repository, { type: 'git', url: 'https://git-landfill.com/garbage' })
    })
  })

  test('scoped package names', async () => {
    // Derive from directories
    await fix.setup('scope')
    const pkg1 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped')
    })
    assert.strictEqual(pkg1.name, '@test/scoped')

    // Pass non-scoped name
    await fix.setup('scope')
    const pkg2 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped'),
      name: 'foo'
    })
    assert.strictEqual(pkg2.name, 'foo')

    // scoped name
    await fix.setup('scope')
    const pkg3 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped'),
      name: '@other/foo'
    })
    assert.strictEqual(pkg3.name, '@other/foo')

    // Load from existing package.json
    const pkg5 = await createPackageJson({
      cwd: path.join(fix.TMP, '@test', 'scoped')
    })
    assert.strictEqual(pkg5.name, '@other/foo')
  })

  suite('scaffold keywords', () => {
    test('merge keywords', async () => {
      await fix.setup('overrides-keywords')
      const pkg = await createPackageJson({
        keywords: 'baz' // TODO: if keyworsd is _not_ an array, should it merge or overwrite??
      })

      assert.deepStrictEqual(pkg.keywords, ['foo', 'bar', 'baz'])
    })

    test('unique keywords', async () => {
      await fix.setup('overrides-keywords')
      const pkg = await createPackageJson({
        keywords: 'foo'
      })

      assert.deepStrictEqual(pkg.keywords, ['foo', 'bar'])
    })
  })

  suite('scaffold repository', () => {
    before(async () => {
      return fix.setup()
    })

    test('repository as object', async () => {
      const pkg = await createPackageJson({
        repository: {
          type: 'svn',
          url: 'https://sourceforge.com/wat'
        }
      })

      assert.deepStrictEqual(pkg.repository, {
        type: 'svn',
        url: 'https://sourceforge.com/wat'
      })
    })

    test('repository as string', async () => {
      const pkg = await createPackageJson({
        repository: 'https://somegit.repo'
      })

      assert.deepStrictEqual(pkg.repository, {
        type: 'git',
        url: 'https://somegit.repo'
      })
    })
  })

  test('scaffold private', async () => {
    await fix.setup()
    const pkg = await createPackageJson({
      private: true
    })

    assert.strictEqual(pkg.private, true)
  })

  test('scaffold scripts', async () => {
    await fix.setup()
    const pkg = await createPackageJson()
    assert.deepStrictEqual(pkg.scripts, { test: 'echo "Error: no test specified" && exit 1' })
  })

  test('scaffold peerDependencies', async () => {
    await fix.setup()
    const pkg = await createPackageJson(
      {
        peerDependencies: ['mocha@~8.0.0', 'eslint']
      }
    )

    assert.deepStrictEqual(pkg.peerDependencies, { mocha: '~8.0.0', eslint: '*' })
  })

  suite('scaffold man', () => {
    test('man as array', async () => {
      await fix.setup()
      const pkg = await createPackageJson({ man: ['./man/foo.1', './man/bar.1'] })

      assert.deepStrictEqual(pkg.man, ['./man/foo.1', './man/bar.1'])
    })

    test('man as singular array', async () => {
      await fix.setup()
      const pkg = await createPackageJson({ man: ['./man/foo.1'] })

      assert.deepStrictEqual(pkg.man, './man/foo.1')
    })

    test('man as string', async () => {
      await fix.setup()
      const pkg = await createPackageJson({ man: './man/foo.1' })

      assert.deepStrictEqual(pkg.man, './man/foo.1')
    })
  })
})
