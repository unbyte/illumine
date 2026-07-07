# @illumine/npm-diff

Diff two versions of an npm package in VS Code, unminified and formatted.

## CLI

```sh
npx @illumine/npm-diff react 18.2.0 18.3.0
```

Omit the versions to pick them interactively. Opens VS Code with the
[compare-folders](https://marketplace.visualstudio.com/items?itemName=moshfeu.compare-folders)
extension, so a `code` CLI on your `PATH` is required.

## Options

| Option            | Description                          | Default                       |
| ----------------- | -------------------------------------| ----------------------------- |
| `-r, --registry`  | npm registry to query.               | `https://registry.npmjs.org`  |
| `-w, --workspace` | Directory to place the two versions. | a temp dir, removed on exit   |
| `-u, --unminify`  | Unminify sources before diffing.     | off                           |

## License

MIT
