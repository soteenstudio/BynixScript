const fs = require('node:fs')
const path = require('node:path')
const { build } = require('esbuild')
const { compileSource: bootstrapSource } = require('./compile.cjs')
const { Script } = require('node:vm')

const root = path.resolve(__dirname, '..')
const temporary = fs.mkdtempSync(path.join(root, '.bynix-build-'))
const source = path.join(root, 'src')
const output = path.join(root, 'dist', 'index.min.cjs')

async function main() {
  try {
    const parserSource = path.join(source, 'parser')
    const parserOutput = path.join(temporary, 'parser')
    fs.mkdirSync(parserOutput)
    for (const name of ['lexer', 'syntax', 'compiler']) {
      const code = bootstrapSource(fs.readFileSync(path.join(parserSource, `${name}.bs`), 'utf8'))
      new Script(code, { filename: `${name}.js` })
      fs.writeFileSync(path.join(parserOutput, `${name}.js`), code)
    }
    const nativeCompiler = require(path.join(parserOutput, 'compiler.js')).compileSource
    for (const name of ['lexer', 'syntax', 'compiler']) {
      new Script(nativeCompiler(fs.readFileSync(path.join(parserSource, `${name}.bs`), 'utf8')))
    }
    const example = 'func greet():\n  print("native compiler ready")\nend\ngreet()'
    const messages = []
    new Script(nativeCompiler(example)).runInNewContext({ console: { log: message => messages.push(message) } })
    if (messages.length !== 1 || messages[0] !== 'native compiler ready') {
      throw new Error('Generated compiler failed its bootstrap smoke test')
    }
    for (const name of fs.readdirSync(source, { withFileTypes: true })) {
      if (name.isFile() && name.name.endsWith('.bs')) {
        fs.writeFileSync(path.join(temporary, name.name.replace(/\.bs$/, '.js')),
          nativeCompiler(fs.readFileSync(path.join(source, name.name), 'utf8')))
      }
    }

    await build({
      entryPoints: [path.join(temporary, 'index.js')],
      outfile: output,
      platform: 'node',
      format: 'cjs',
      bundle: true,
      minify: true,
      banner: { js: '#!/usr/bin/env node' },
      target: 'node20'
    })
    fs.chmodSync(output, 0o755)
    await build({
      entryPoints: [path.join(root, 'scripts', 'browser-entry.cjs')],
      outfile: path.join(root, 'js', 'browser.js'),
      platform: 'browser',
      format: 'iife',
      bundle: true,
      minify: true,
      alias: { 'bynix-native': path.join(parserOutput, 'compiler.js') }
    })
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
