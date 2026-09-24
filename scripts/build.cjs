const fs = require('node:fs')
const path = require('node:path')
const { build } = require('esbuild')
const { compileSource } = require('./compile.cjs')

const root = path.resolve(__dirname, '..')
const temporary = fs.mkdtempSync(path.join(root, '.bynix-build-'))
const source = path.join(root, 'src')
const output = path.join(root, 'dist', 'index.min.cjs')

async function main() {
  try {
    for (const name of fs.readdirSync(source, { withFileTypes: true })) {
      if (name.isFile() && name.name.endsWith('.bs')) {
        fs.writeFileSync(path.join(temporary, name.name.replace(/\.bs$/, '.js')),
          compileSource(fs.readFileSync(path.join(source, name.name), 'utf8')))
      }
    }

    await build({
      entryPoints: [path.join(temporary, 'index.js')],
      outfile: output,
      platform: 'node',
      format: 'cjs',
      bundle: true,
      minify: true,
      target: 'node20'
    })
    fs.chmodSync(output, 0o755)
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
