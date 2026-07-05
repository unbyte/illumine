# @illumine/unminify

Reverse production transforms to make JavaScript readable again.

## CLI

```sh
npx @illumine/unminify input.js -o output.js
```

```
Usage: unminify [options] <input>

Arguments:
  input                    input file path

Options:
  -o, --output <output>    output file path (defaults to stdout)
  -p, --passes <count>     number of reversal passes
```

## Library

```sh
npm install @illumine/unminify
```

```ts
import { unminify } from '@illumine/unminify'

const readable = await unminify(minifiedCode)
```

## License

MIT
