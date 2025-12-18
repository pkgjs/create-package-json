# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.2.0](https://github.com/wesleytodd/create-package-json/compare/v1.1.0...v1.2.0) (2025-12-18)


### Features

* added support for monorepo workspaces ([#233](https://github.com/wesleytodd/create-package-json/issues/233)) ([f6ec4e0](https://github.com/wesleytodd/create-package-json/commit/f6ec4e031d666792b626f0062d399799b166cf15))
* workspaces support ([#226](https://github.com/wesleytodd/create-package-json/issues/226)) ([38cc19d](https://github.com/wesleytodd/create-package-json/commit/38cc19d5989f222fc444bdce28d1c681ac401605))


### Bug Fixes

* **ci:** updated ci and improved release scripts ([#234](https://github.com/wesleytodd/create-package-json/issues/234)) ([e749c31](https://github.com/wesleytodd/create-package-json/commit/e749c312269b7e5fe66b389490e0f1a9243e3a20))
* **devdeps:** updated devdeps ([#235](https://github.com/wesleytodd/create-package-json/issues/235)) ([f34de1f](https://github.com/wesleytodd/create-package-json/commit/f34de1fc246d7f128f26c154162a648b2243ef34))
* **test:** added test for null private field ([5d1f97a](https://github.com/wesleytodd/create-package-json/commit/5d1f97a924a08b6028e4959173c88353403930bf))
* **test:** fixed npm parity test ([cd4b569](https://github.com/wesleytodd/create-package-json/commit/cd4b569d30f3923ae9d3e065973df4c9bbfba495))

## [1.1.0](https://github.com/wesleytodd/create-package-json/compare/v1.0.0...v1.1.0) (2024-01-10)


### Features

* migrate to @npmcli/package-json ([6e1df67](https://github.com/wesleytodd/create-package-json/commit/6e1df676a548a5c98a1de05b208f8700ef9aadc6))


### Bug Fixes

* main should default to existing field when preesnt ([6fd766d](https://github.com/wesleytodd/create-package-json/commit/6fd766df842b59e2034d2264556c41b976b9c0ad))

## [1.0.0-6](https://github.com/wesleytodd/create-package-json/compare/v1.0.0-5...v1.0.0-6) (2021-02-24)


### Features

* added scope option and use npm name suggestion package ([ee41b3a](https://github.com/wesleytodd/create-package-json/commit/ee41b3a6e6fc38367d9559fb7f7e16d69b8fbbf7))

## [1.0.0-5](https://github.com/wesleytodd/create-package-json/compare/v1.0.0-4...v1.0.0-5) (2021-02-24)


### Bug Fixes

* remove package.json extras added by read-package-json ([90a2b5b](https://github.com/wesleytodd/create-package-json/commit/90a2b5bd4c28d1ae41e550d233f7e2ddd29946a7))

## [1.0.0-4](https://github.com/wesleytodd/create-package-json/compare/v1.0.0-3...v1.0.0-4) (2021-02-24)


### Bug Fixes

* opta@0.1.0 ([2996c9b](https://github.com/wesleytodd/create-package-json/commit/2996c9b48a3f348c222d2ec5c2c0a4e9c90d54e7))

## [1.0.0-3](https://github.com/wesleytodd/create-package-json/compare/v1.0.0-2...v1.0.0-3) (2021-02-24)


### ⚠ BREAKING CHANGES

* refactor writePackageJson to not require path

### Bug Fixes

* default git user if we cannot find a default in the package.json ([3cbe85a](https://github.com/wesleytodd/create-package-json/commit/3cbe85a7a2bc29f4baeaba313433a0795c8394c5))
* improved default settings with opta ([075d666](https://github.com/wesleytodd/create-package-json/commit/075d666cbe90ef09a8f7689d5aba967c95f705fd))
* refactor repository to handle objects ([ba40f0c](https://github.com/wesleytodd/create-package-json/commit/ba40f0c716d7bd3e32b9219bdc6f859d6dc711c6))
* refactor writePackageJson to not require path ([7939e24](https://github.com/wesleytodd/create-package-json/commit/7939e243e2cd7b5e9fa7b6334f7087ca8f624218))
* **test:** replace Object.fromEntries with the godlike reduce() ([c520eb8](https://github.com/wesleytodd/create-package-json/commit/c520eb8975d3ef8845a4df8f7faecc8b9d394095))

## [1.0.0-2](https://github.com/wesleytodd/create-package-json/compare/v1.0.0-1...v1.0.0-2) (2020-10-21)


### Features

* logging and scripts wip; opta@0.0.6 & loggerr@3.0.0 ([f4ccbb4](https://github.com/wesleytodd/create-package-json/commit/f4ccbb42af19a3ed9e295766a77d428d189eb35a))
