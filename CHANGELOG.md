# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/). While at 0.x,
minor releases may break. Releases are tagged `vX.Y.Z` and publish from CI.

## [0.1.1] - 2026-08-21

### Added

- `resolvedVersions` and `pinnedVersions`, which read a pnpm lockfile and the
  manifests that pin a package, so a repository can gate itself against
  resolving two copies of anything that holds module state.

### Fixed

- A message sharing its name with an object prototype member, `constructor` and
  `toString` among them, no longer crashes the gates or slips past the orphan
  check.
- `serializeCatalog` answers readable JSON for a catalogue carrying no metadata
  entry, where it used to write the bare word undefined.

## [0.1.0] - 2026-08-20

### Added

- `startLocale`, which resolves a locale, loads every catalogue in parallel and
  sets each under its own text domain before it returns. A catalogue naming no
  domain lands under the default domain the WordPress packages read.
- `displayLocale`, `rememberLocale` and `formatDate`, the seam dates and numbers
  follow. `formatDate` takes a date or the text a server stored, and the options
  bag any real format needs.
- `pot`, which extracts messages through the four gettext call shapes and
  optionally through Go markers and templates. The Go walk reads nothing unless
  it is given roots.
- `compileCatalog` and `serializeCatalog`, turning PO sources into the JSON a
  locale chunk ships, metadata entry first and deterministic.
- `untranslated`, `orphaned` and `mismatched`, the three gates over a
  catalogue's health. `mismatched` refuses a translation whose placeholders
  its message does not name, bare placeholders included.
- `syncTranslations` and `poeditorAt`, which carry translations home from a
  platform. A translation once set is never removed by a sync, and the summary
  says how many answers were kept where the platform holds nothing.
