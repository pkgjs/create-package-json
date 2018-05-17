# Create a `package.json` like a champion

This is a fully featured `package.json` scaffolding tool.  It goes above and beyond the basic `npm init`
by supporting (almost) all of the keys you can set in a `package.json`.  It can be used as a simple cli
tool, or inside your other package scaffolding tools.

*NOTE:* This is a work in progress, more to come on docs and there are some missing options at the moment.
[See here](https://github.com/wesleytodd/create-package-json/blob/master/index.js#L14-L27) for missing fields.

## Usage

```
$ npm init package-json
```

With `npm@6` this will run this package with `npx`.  If you are on an earlier version of `npm` you will
need to install globally and run directly:

```
$ npm install -g create-package-json
$ create-package-json
```

### CLI Usage

```
$ create-package-json --help

  Usage: create-package-json [options] <directory>

  Options:

    -V, --version                      output the version number
    --ignore-existing                  Ignore existing package.json
    --no-prompt                        Skip prompts and just use input options
    --spacer [json spacer]             Format character for package json (default: 2)
    --name [name]                      The package name
    --scope [scope]                    The package scope
    --ver [version]                    The package version
    --description [description]        The package description
    --author [author]                  The package author
    --repository [repository]          The package repository
    --keywords [keywords]              The package keywords
    --license [license]                The package license
    --main [main]                      The package main entry point
    --private                          This is a private package
    --dependencies [dependencies]      Package dependencies
    --dev-dependencies [dependencies]  Package dev dependencies
    --scripts [scripts]                Package scripts
    -h, --help                         output usage information
```

Dependencies should be a comma separated list like `--dependencies="express,react"`, and it can also
include versions, `--dependencies="express@5"`.

Scripts should be defined as a json string, `--scripts='{"test":"exit 0"}'`.

### Programmatic Usage

```javascript
const createPackageJson = require('create-package-json')

;(async () => {
  const pkg = await createPackageJson({
    name: '@myscope/my-package',
    description: 'A useless new package',
    dependencies: ['express'],
    devDependencies: ['mocha'],
    author: 'Me <me@me.com>',
    version: '1.0.0'
  })

  console.log(pkg) // The json after writing and installing
})()
```
