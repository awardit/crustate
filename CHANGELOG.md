# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Added license file, MIT, same as `package.json` already specifies.
- Added `messageMatched` events when subscribers on `Storage` match messages.
- Added an optional parameter of `sourceName` to `sendMessage` which is appended
  to the source-path, this parameter defaults to the anonymous source "`$`".
- Added TodoMVC Example

### Changed
- Changed all events which had a `StateInstance` as the last parameter now no
  longer have that parameter.
- React `DataProvider` no longer wrap nested state-instances by default
- `State` type-signature has been modified to also carry the `Message` type,
  this also propagates to `StateInstance`, `StateUpdate`, `Storage`,
  `StateData` and `useData`.

### Fixed
- Messages queued by an instance creation are no longer processed by the same
  instance, this prevents any logic loops from forming.

## [0.0.1] - 2019-04-10
### Added
- Initial release
