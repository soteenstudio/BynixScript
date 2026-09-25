const fs = require('node:fs')
const path = require('node:path')
const { build } = require('esbuild')
const { compileSource } = require('./compile.cjs')

const root = path.resolve(__dirname, '..')
const temporary = fs.mkdtempSync(path.join(root, '.bynix-build-'))
const source = path.join(root, 'src')
const output = path.join(root, 'dist', 'index.min.cjs')
const generated = path.join(root, 'dist', 'modules')
const modules = ['config', 'download', 'error', 'dirProcess', 'watcher']

async function main() {
  try {
    for (const name of fs.readdirSync(source, { withFileTypes: true })) {
      if (name.isFile() && name.name.endsWith('.bs')) {
        fs.writeFileSync(path.join(temporary, name.name.replace(/\.bs$/, '.js')),
          compileSource(fs.readFileSync(path.join(source, name.name), 'utf8')))
      }
    }

    fs.rmSync(generated, { recursive: true, force: true })
    await build({
      entryPoints: modules.map(name => path.join(temporary, `${name}.js`)),
      outdir: generated,
      platform: 'node',
      format: 'cjs',
      bundle: true,
      target: 'node20',
      plugins: [{
        name: 'compiler',
        setup(bundle) {
          bundle.onResolve({ filter: /^\.\.\/scripts\/compile\.cjs$/ }, () => ({
            path: path.join(root, 'scripts', 'compile.cjs')
          }))
        }
      }]
    })

    await build({
      entryPoints: [path.join(temporary, 'index.js')],
      outfile: output,
      platform: 'node',
      format: 'cjs',
      bundle: true,
      minify: true,
      target: 'node20',
      plugins: [{
        name: 'build-imports',
        setup(bundle) {
          bundle.onResolve({ filter: /^\.\.\/scripts\/compile\.cjs$/ }, () => ({
            path: path.join(root, 'scripts', 'compile.cjs')
          }))
          bundle.onResolve({ filter: /^\.\.\/package\.json$/ }, () => ({
            path: path.join(root, 'package.json')
          }))
        }
      }]
    })
    fs.chmodSync(output, 0o755)
    await build({
      entryPoints: [path.join(root, 'js', 'browser.js')],
      outfile: path.join(root, 'dist', 'browser.js'),
      platform: 'browser',
      format: 'iife',
      bundle: true,
      plugins: [{
        name: 'browser-config',
        setup(bundle) {
          bundle.onResolve({ filter: /^fs$/ }, () => ({ path: 'fs', namespace: 'browser-config' }))
          bundle.onLoad({ filter: /.*/, namespace: 'browser-config' }, () => ({
            contents: 'module.exports = { readFileSync() { throw new Error("No config file in browser") } }',
            loader: 'js'
          }))
        }
      }]
    })
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
