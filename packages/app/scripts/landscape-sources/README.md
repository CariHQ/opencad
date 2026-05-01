# Landscape Sources

Place raw Poly Haven CC0 GLB files here before running the bake pipeline:

```
pnpm --filter=@opencad/app bake:landscape
```

## Required files

Create a `sources.json` file listing each asset:

```json
[
  {
    "id": "tree_oak",
    "displayNameKey": "landscape.species.oakTree",
    "tab": "trees",
    "glbFile": "oak_tree.glb",
    "license": "CC0",
    "source": "Poly Haven",
    "author": "Poly Haven Contributors"
  }
]
```

## License

All source assets must be CC0 or equivalent. Document attribution in `sources.json`.
This directory is gitignored (raw sources are too large). The baked outputs in
`public/assets/landscape/starter/` are committed.
