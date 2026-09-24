# Command

After `npm install -g bynixscript`, use the installed `bynix` executable:

| Command | Action |
| --- | --- |
| `bynix run path/to/script.bys` | Translate and run a BynixScript file. |
| `bynix compile path/to/script.bys` | Write translated JavaScript beside the source file (`.js`, or `.mjs` for `.mbs`). Does not run the file. |
| `bynix print path/to/script.bys` | Print translated JavaScript without running the file. |
| `bynix delete path/to/script.bys` | Delete the specified file. A path is always required. |

By default, input files use `.bys`, `.bynixscript`, or `.mbs`. Paths are relative to the current directory, or may be absolute. Invalid paths and unsupported extensions produce an error and a nonzero exit status.

Use `bynix --help` for all commands, `bynix <command> --help` for command-specific help, and `bynix --version` for the version. The earlier option forms `bynix -r <file>`, `bynix -c <file>`, `bynix -p <file>`, and `bynix -d <file>` remain available.

For development, run `npm ci` followed by `npm run build`. The build uses the `bynixscript` development dependency as a bootstrap compiler to translate the `.bs` CLI sources through BynixScript's normal parser and replacement passes, then bundles the resulting JavaScript with esbuild into `dist/index.min.cjs`. `npm test` builds the executable, checks that all CLI sources compile through that same path, and runs the command tests.
