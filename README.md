# Create a `package.json` like a champion

This is a fully featured `package.json` scaffolding tool.  It goes above and beyond the basic `npm init`
by supporting (almost) all of the keys you can set in a `package.json`.  It can be used as a simple cli
tool, or inside your other package scaffolding tools.

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

*NOTE:* This is a work in progress, more to come on docs and there are some missing options at the moment.
