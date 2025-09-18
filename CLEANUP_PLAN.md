# CLEANUP_PLAN.md — Stage 1 Archival

All candidates have been moved to `./deprecated/` for safe keeping. Restore with `git mv` if needed; delete after sign-off.

| Former Path | Current Location | Reason for Removal | `git hash-object` | Restore Command |
| --- | --- | --- | --- | --- |
| `src/App.jsx` | `deprecated/legacy-monolith/App.jsx.remove.me` | Legacy 3.5 k-line monolith unused by Vite entrypoint; blocks newcomers | `69371a99170b9d9bf4e3ac6c62f6e503684b812f` | `git mv deprecated/legacy-monolith/App.jsx.remove.me src/App.jsx` |
| `src/App.jsx.backup` | `deprecated/legacy-monolith/App.jsx.backup.remove.me` | Duplicate of monolith backup; superseded by feature modules | `69371a99170b9d9bf4e3ac6c62f6e503684b812f` | `git mv deprecated/legacy-monolith/App.jsx.backup.remove.me src/App.jsx.backup` |
| `src/update-openai-model-src.patch` | `deprecated/legacy-monolith/update-openai-model-src.patch.remove.me` | Patch artifact targeting deleted monolith | `9e50ba91f09d7f63eea612f5e7064e8a75569a74` | `git mv deprecated/legacy-monolith/update-openai-model-src.patch.remove.me src/update-openai-model-src.patch` |
| `dist/` | `deprecated/build-artifacts/dist.remove.me/` | Built assets tracked in git; should be generated on demand | `index.html` → `3168246c9d826b61fcdd429ba0acfd1d56abecd3` | `git mv deprecated/build-artifacts/dist.remove.me dist` |
| `.DS_Store` (root) | `deprecated/misc/root.DS_Store.remove.me` | macOS junk file | `a710d0c19dcd8b3e3642f63b34a9915a2cb970d8` | `git mv deprecated/misc/root.DS_Store.remove.me .DS_Store` |
| `src/assets/.DS_Store` | `deprecated/misc/src-assets.DS_Store.remove.me` | macOS junk file | `5008ddfcf53c02e82d7eee2e57c38e5672ef89f6` | `git mv deprecated/misc/src-assets.DS_Store.remove.me src/assets/.DS_Store` |
| `src/.DS_Store` | `deprecated/misc/src.DS_Store.remove.me` | macOS junk file | `1a8d1a6e6b8cf972741fa983c17501ed7507388d` | `git mv deprecated/misc/src.DS_Store.remove.me src/.DS_Store` |
| `main` | `deprecated/misc/main.remove.me` | Empty placeholder file | `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` | `git mv deprecated/misc/main.remove.me main` |
| `node_modules/.DS_Store` | `deprecated/misc/node_modules.DS_Store.remove.me` | macOS junk file inside dependency folder | `d472cbd0122c0bb67a2a6cd4034ab7c14b4a6a09` | `git mv deprecated/misc/node_modules.DS_Store.remove.me node_modules/.DS_Store` |
| `node_modules/date-fns/.DS_Store` | `deprecated/misc/date-fns/node_modules-date-fns.DS_Store.remove.me` | macOS junk file inside dependency folder | `beffeafc7bd17f0a74381485e309f129e70ffc7d` | `git mv deprecated/misc/date-fns/node_modules-date-fns.DS_Store.remove.me node_modules/date-fns/.DS_Store` |

## Next Steps

1. Confirm nothing depends on archived assets (search for imports/links).
2. After approval, delete archived files or replace with documentation snapshots (e.g., attach monolith to release notes).
3. Add `.gitignore` entry for `dist/`, `.DS_Store`, and other generated files before final removal.

- `assets/index-739d8080.js` → `dd5d2a98bce6c79193903fb12abab6363718e8c7`
- `assets/index.es-6fdf6337.js` → `ec6a3d726d2962b641288f579e89d44a2755df5e`
- `assets/index-ca45457b.css` → `bca738cc88a4d471a465b93ce4004f4ab6228165`
- `assets/html2canvas.esm-e0a7d97b.js` → `06a7a664a268abbc2ba2718bf095ab2bd6906cb9`
- `assets/purify.es-2de9db7f.js` → `8c0185916bb1fb9efd7d90b9b9baf7aa18261d6f`
