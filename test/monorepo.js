'use strict';
const { suite, test, before } = require('mocha');
const assert = require('assert');
const path = require('path');
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);
const fixtures = require('fs-test-fixtures');
const optaUtils = require('opta/utils');
const createPkgJson = require('..');

suite('monorepo', () => {
  let fix;
  let createPackageJson;
  let barePrompt;

  before(() => {
    fix = fixtures();
    barePrompt = optaUtils.test.promptModule();
    createPackageJson = async (opts, prompt = barePrompt) => {
      return createPkgJson({
        silent: true,
        cwd: fix.TMP ? fix.TMP : process.cwd(),
        ...opts
      }, {
        promptor: prompt
      });
    };
  });

  test('create a new default package.json from a monorepo without workspaces', async () => {
    await fix.setup('monorepo-no-workspaces');
    const pkg = await createPackageJson({
      workspaceRoot: fix.TMP
    });

    assert.strictEqual(pkg.name, '@test/monorepo-no-workspaces');
    assert.deepStrictEqual(pkg.workspaces, ['packages/foo']);
  });

  test('create a new default package.json in an existing monorepo with workspaces', async () => {
    await fix.setup('monorepo');
    const pkg = await createPackageJson();

    assert.strictEqual(pkg.name, '@test/monorepo');
    assert.deepStrictEqual(pkg.workspaces, ['packages/*']);
  });

  test('create a new workspace package.json in a git repo without workspaces', async () => {
    await fix.setup('monorepo-no-workspaces');
    await execFile('git', ['init'], { cwd: fix.TMP });

    const pkg = await createPackageJson({
      cwd: path.join(fix.TMP, 'packages', 'bar')
    });

    assert.strictEqual(pkg.name, 'bar');
    assert.deepStrictEqual(pkg.workspaces, undefined);
  });

  test('create a new workspace package.json in an existing monorepo', async () => {
    await fix.setup('monorepo');
    const pkg = await createPackageJson({
      cwd: path.join(fix.TMP, 'packages', 'bar')
    });

    assert.strictEqual(pkg.name, 'bar');
    assert.strictEqual(pkg.workspaces, undefined);
  });

  test('install dependencies in a workspace aware way', async () => {
    await fix.setup('monorepo');
    const pkg = await createPackageJson({
      cwd: path.join(fix.TMP, 'packages', 'bar'),
      dependencies: ['english-days']
    });

    assert.strictEqual(pkg.name, 'bar');
    assert.strictEqual(pkg.workspaces, undefined);
    assert.strictEqual(pkg.dependencies['english-days'], '^1.0.0');
  });

  test('create a new workspace package.json in an existing monorepo not matching a workspace glob', async () => {
    await fix.setup('monorepo');
    const pkg = await createPackageJson({
      cwd: path.join(fix.TMP, 'baz'),
      dependencies: ['english-days']
    });

    assert.strictEqual(pkg.name, 'baz');
    assert.strictEqual(pkg.workspaces, undefined);
    assert.strictEqual(pkg.dependencies['english-days'], '^1.0.0');
  });

  test('create a new workspace package.json in an existing monorepo passing workspaceRoot', async () => {
    await fix.setup('monorepo');
    const pkg = await createPackageJson(
      {
        cwd: path.join(fix.TMP, 'baz'),
        workspaceRoot: fix.TMP
      },
      optaUtils.test.promptModule({
        prompts: {
          workspaceRoot: {
            assert: (p) => {
              assert.strictEqual(p.name, 'workspaceRoot');
              assert.strictEqual(p.when(), false);
            }
          },
          workspaces: {
            assert: (p) => {
              assert.strictEqual(p.name, 'workspaces');
              assert.strictEqual(p.when(), false);
            }
          }
        }
      })
    );

    assert.strictEqual(pkg.name, 'baz');
    assert.strictEqual(pkg.workspaces, undefined);
  });
});
