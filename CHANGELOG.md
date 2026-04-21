## [1.1.1](https://github.com/CariHQ/opencad/compare/v1.1.0...v1.1.1) (2026-04-21)


### Bug Fixes

* **archicad:** build NUL-terminator regex via RegExp() to satisfy lint ([3186d66](https://github.com/CariHQ/opencad/commit/3186d66d0e8c822db0710d4ab49ce26e7a226d6e))

## [1.0.10](https://github.com/CariHQ/opencad/compare/v1.0.9...v1.0.10) (2026-04-19)


### Bug Fixes

* **ci:** increase Docker job timeout to 60 min for arm64 QEMU build ([0680ad1](https://github.com/CariHQ/opencad/commit/0680ad10e021f2002759fac9487e163b10638a22))

## [1.0.9](https://github.com/CariHQ/opencad/compare/v1.0.8...v1.0.9) (2026-04-19)


### Bug Fixes

* **ci:** remove Windows .pnpm cleanup step that broke node_modules ([f4bba27](https://github.com/CariHQ/opencad/commit/f4bba2721bd5e422f6ef4c49c6c82a81855574c7))

## [1.0.8](https://github.com/CariHQ/opencad/compare/v1.0.7...v1.0.8) (2026-04-19)


### Bug Fixes

* **ci:** pin wasm-bindgen-cli to 0.2.93 to match Cargo.toml ([1572487](https://github.com/CariHQ/opencad/commit/1572487cfae5377f1b7eeab80c8d23640cbea540))

## [1.0.7](https://github.com/CariHQ/opencad/compare/v1.0.6...v1.0.7) (2026-04-19)


### Bug Fixes

* **ci:** install wasm-bindgen-cli on all desktop/Docker runners ([259e173](https://github.com/CariHQ/opencad/commit/259e173d080a5a9ca0b74bd6811f0535faa54dc8))

## [1.0.6](https://github.com/CariHQ/opencad/compare/v1.0.5...v1.0.6) (2026-04-19)


### Bug Fixes

* **release:** install wasm-pack for desktop builds, fix filter syntax ([3ab1b24](https://github.com/CariHQ/opencad/commit/3ab1b2447bea2cad7149de3371159607c5ed6207))

## [1.0.5](https://github.com/CariHQ/opencad/compare/v1.0.4...v1.0.5) (2026-04-19)


### Bug Fixes

* **docker:** replace nginx with serve for Cloud Run ([bf86486](https://github.com/CariHQ/opencad/commit/bf864862a7e784f9265f524e3584d2e3fcf8c570))

## [1.0.4](https://github.com/CariHQ/opencad/compare/v1.0.3...v1.0.4) (2026-04-19)


### Bug Fixes

* **release:** fix Tauri script, wasm-pack build exclusion, and Dockerfile ([f271104](https://github.com/CariHQ/opencad/commit/f2711046f74f37cf6f0ff6c7235a9bf2200cf3e8))

## [1.0.3](https://github.com/CariHQ/opencad/compare/v1.0.2...v1.0.3) (2026-04-19)


### Bug Fixes

* **release:** trigger desktop builds on release:published, not tag push ([f25a70e](https://github.com/CariHQ/opencad/commit/f25a70eeea80e47ed9f085d187c8a39136f7e3d9))

## [1.0.2](https://github.com/CariHQ/opencad/compare/v1.0.1...v1.0.2) (2026-04-19)


### Bug Fixes

* **release:** use RELEASE_TOKEN PAT so semantic-release can push to main ([9100d21](https://github.com/CariHQ/opencad/commit/9100d21bab338f79a3c01467c2632688558cd2d0))
