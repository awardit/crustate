# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Renamed `ModelDataType` and `ModelInitType` to `TypeofModelData` and
  `TypeofModelInit`.

## [0.4.0] - 2019-10-10
### Added
- Helper types `ModelDataType<M>` and `ModelInitType<M>` which resolve to the
  model `M`'s data-type and init-type.
### Changed
- `StateData` now takes a `Model`-type as its single type-parameter instead of
  the previous three types model-data, model-init, and model-message.
### Fixed
- Do not mangle `id` property of model when minifying the React adapter.

## [0.3.2] - 2019-08-08
### Fixed
- Fixed bug in `Storage`.`broadcastMessage` which caused it to not traverse
  child states.

## [0.3.1] - 2019-08-08
### Added
- Added `Storage`.`broadcastMessage` which sends a message to all its states.

## [0.3.0] - 2019-06-26
### Changed
- `Update<T>` is now an object with `data` and `messages`
- `update` now returns a nullable `Update`
- `State` -> `Model`
- `Init` -> `ModelInit`
- `Model`.`name` -> `id`
- `StateUpdate` -> `ModelUpdate`
- `Subscribe` -> `ModelSubscribe`
- `SubscriptionMap` -> `Subscriptions`
- `Subscription`.`filter` -> `matching`
- `Supervisor`.`getNested` -> `getState`
- `Supervisor`.`getNestedOrCreate` -> `createState`
- `Supervisor`.`removeNested` -> `removeState`
- `Storage`.`stateDefinition` -> `getModel`
- `Storage`.`registerState` -> `addModel`
- `StateInstance` -> `State`
- React `StateData`.`state` -> `model`

### Removed
- `Storage`.`tryRegisterState`
- `NONE`
- `NoUpdate`
- `DataUpdate<T>`
- `MessageUpdate<T>`

## [0.2.0] - 2019-06-19
### Added
- XO as a linter and coding standard
- Explicit return-type annotations for `void` returns.

### Changed
- `Storage`.`replyMessage` will now find the closest state instead of throwing
  if it does not find the exact path, the source path will still be the same
  as if the state existed.
- React `DataProvider` now only uses the initial data as type-parameter.
- `StateInstance` no longer takes the message-type as a type-parameter.

## [0.1.2] - 2019-06-17
### Fixed
- Modules now use `.esm.js` instead of `.mjs`, this will allow them to import
  CommonJS modules since they are no longer considered `javascript/esm`.

## [0.1.1] - 2019-06-13
### Changed
- Package will no longer run a full test + production build when installing,
  this has been moved to `prepack` from `prepare`.

## [0.1.0] - 2019-06-13
### Added
- Added `Storage` `restoreSnapshot`
- Added optional `name` parameter to React `DataProvider` which will use the
  supplied string as the state-name.
- Added optional `name` parameter to `Storage` and `StateInstance` `getNested`,
  `getNestedOrCreate`, and `removeNested`.

### Changes
- `Subscription`, `SubscriptionMap` and `MessageFilter` are now generic over
  `<M: Message>` instead of just using `Message`.
- `Snapshot` `defName` is renamed to `id`.

## [0.0.6] - 2019-06-07
### Changed
- React `StorageProvider` is now its own function-component, with the `value`
  property being replaced with `storage` for the storage instance.
- React `StateProvider` will now exclude the `children` prop when propagating
  props as initial data to the state instance.
- React components wrapping children now no longer require the `children` prop
  to be defined at all times.

## [0.0.5] - 2019-06-01
### Added
- Added missing second `sourceName` parameter to `useSendMessage` closure.
- Added `removeNested` to `Storage` and `StateInstance`.
- React `StateProvider` will now call `removeNested` if it is the last listener
  to the state `stateNewData` event.
- Added `StatePath` type to exports.

### Changed
- `Message`'s `tag` property is now contravariant to allow subtypes (ie. exact
  string-constants).
- The `stateNewData` event on `StateInstance` will now use `T` as the type
  for the state-data.
- `crustate/react` now uses named imports from `react`.
- `State` `subscriptions` is renamed to `subscribe`
- `State` now subscribes using a dictionary with message key-names as the key
  and subscription settings as the value.
- `Storage` `addSubscriber` takes a `SubscriptionMap` as the second parameter
  instead of an array of the old `Subscription` type.
- `Sink` is now typed by the message-type it accepts.

## [0.0.4] - 2019-05-14
### Fixed
- Added `replyMessage` to list of public symbols for build-script.

## [0.0.3] - 2019-05-14
### Added
- Added `State`.`replyMessage` to allow outside code to send messages to
  state-instances.

## [0.0.2] - 2019-05-10
### Added
- Added license file, MIT, same as `package.json` already specifies.
- Added `messageMatched` events when subscriptions on `Storage` match messages.
- Added an optional parameter of `sourceName` to `sendMessage` which is appended
  to the source-path, this parameter defaults to the anonymous source "`$`".
- Added TodoMVC Example

### Changed
- Changed all events which had a `StateInstance` as the last parameter now no
  longer have that parameter.
- `State` type-signature has been modified to also carry the `Message` type,
  this also propagates to `StateInstance`, `StateUpdate`, `Storage`,
  `StateData` and `useData`.

### Fixed
- Messages queued by an instance creation are no longer processed by the same
  instance, this prevents any logic loops from forming.

## [0.0.1] - 2019-04-10
### Added
- Initial release
