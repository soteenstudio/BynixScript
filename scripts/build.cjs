const fs = require('node:fs')
const path = require('node:path')
const { build } = require('esbuild')
const { parseCode, addSemicolons } = require('../js/parser.js')
const { funcReplace } = require('bynixscript/dist/parser/funcDecl.js')

const root = path.resolve(__dirname, '..')
const temporary = fs.mkdtempSync(path.join(root, '.bynix-build-'))
const source = path.join(root, 'src')
const output = path.join(root, 'dist', 'index.min.cjs')

function translateParser(sourceCode) {
  return funcReplace(addSemicolons(parseCode(sourceCode))).replace(/\.change\(/g, '.replace(')
}

async function main() {
  try {
    for (const name of fs.readdirSync(source, { withFileTypes: true })) {
      if (name.isFile() && name.name.endsWith('.bs')) {
        fs.writeFileSync(path.join(temporary, name.name.replace(/\.bs$/, '.js')),
          fs.readFileSync(path.join(source, name.name), 'utf8'))
      }
    }

    const parserOutput = path.join(temporary, 'parser')
    fs.mkdirSync(parserOutput)
    for (const name of fs.readdirSync(path.join(source, 'parser'))) {
      if (name.endsWith('.bs')) {
        const code = fs.readFileSync(path.join(source, 'parser', name), 'utf8')
        fs.writeFileSync(path.join(parserOutput, name.replace(/\.bs$/, '.js')), translateParser(code))
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
