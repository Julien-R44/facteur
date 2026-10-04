# @facteurjs/react

## 2.0.0

### Minor Changes

- 8e2d708: Allow passing ky options to FacteurProvider

### Patch Changes

- 3967a54: Start `useInfiniteNotifications` at page 1 to avoid fetching the first page twice.
- 8d6f7ad: Fix missing kyOptions dependency in FacteurProvider useMemo
- ad4f20a: Require Node.js >= 24
- 99d7f45: Update React Query development dependencies and correct the minimum peer version to 5.82.0, which introduced `mutationOptions`.

  Stabilize query option factory declarations so they preserve cache data and error inference with both the minimum supported peer and newer React Query releases.

- Updated dependencies [e5b0aee]
- Updated dependencies [ad4f20a]
- Updated dependencies [5da38e9]
  - @facteurjs/client@2.0.0

## 2.0.0-beta.3

### Patch Changes

- 8d6f7ad: Fix missing kyOptions dependency in FacteurProvider useMemo
- Updated dependencies [5da38e9]
  - @facteurjs/client@2.0.0-beta.2

## 2.0.0-beta.2

### Patch Changes

- ad4f20a: Require Node.js >= 24
- Updated dependencies [ad4f20a]
  - @facteurjs/client@2.0.0-beta.1

## 2.0.0-beta.1

### Minor Changes

- Allow passing ky options to FacteurProvider

## 1.0.0-beta.0

### Major Changes

- First version

### Patch Changes

- Updated dependencies
  - @facteurjs/client@1.0.0-beta.0
