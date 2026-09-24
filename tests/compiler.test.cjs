const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const { spawnSync } = require('node:child_process')
const { compileSource: bootstrapSource } = require('../scripts/compile.cjs')

const root = path.resolve(__dirname, '..')
const names = ['lexer', 'syntax', 'compiler']

function sources() {
  return names.map(name => fs.readFileSync(path.join(root, 'src/parser', `${name}.bs`), 'utf8'))
}

function loadCompiler(context, translator) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bynix-native-'))
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  for (const [index, name] of names.entries()) {
    const output = translator(sources()[index])
    assert.doesNotThrow(() => new vm.Script(output, { filename: `${name}.js` }))
    fs.writeFileSync(path.join(directory, `${name}.js`), output)
  }
  return {
    lex: require(path.join(directory, 'lexer.js')).lex,
    parse: require(path.join(directory, 'syntax.js')).parse,
    compile: require(path.join(directory, 'compiler.js')).compileSource
  }
}

test('bootstrap version is exact in the manifest and installed package', () => {
  const manifest = require('../package.json')
  assert.equal(manifest.devDependencies.bynixscript, '0.2.1-next')
  assert.equal(require('bynixscript/package.json').version, '0.2.1-next')
})

test('lexer tracks token locations and ignores keywords inside strings and comments', context => {
  const { lex } = loadCompiler(context, bootstrapSource)
  const tokens = lex('# note\nconst text = "if func end" // match\nprint(text)')
  assert.deepEqual(tokens.slice(0, 5).map(token => [token.value, token.line, token.column]), [
    ['\n', 1, 7], ['const', 2, 1], ['text', 2, 7], ['=', 2, 12], ['"if func end"', 2, 14]
  ])
  assert.equal(tokens.filter(token => token.value === 'match').length, 0)
  assert.throws(() => lex('print("unfinished'), /Unterminated string at 1:7/)
  assert.throws(() => lex('/* unfinished'), /Unterminated comment at 1:1/)
})

test('parser preserves precedence and nested block structure', context => {
  const { parse, compile } = loadCompiler(context, bootstrapSource)
  const source = 'func run():\n if true:\n  const value = 2 + 3 * 4\n  print(value)\n end\nend\nrun()'
  const tree = parse(source)
  assert.equal(tree.body[0].type, 'function')
  assert.equal(tree.body[0].body[0].type, 'if')
  const value = tree.body[0].body[0].branches[0].body[0].value
  assert.equal(value.operator, '+')
  assert.equal(value.right.operator, '*')
  const output = []
  vm.runInNewContext(compile(source), { console: { log: item => output.push(item) } })
  assert.deepEqual(output, [14])
})

test('generated code preserves strings, escaped text, and comments', context => {
  const { compile } = loadCompiler(context, bootstrapSource)
  const source = '/* func fake(): end */\nprint("if func end // \\"quoted\\"")\n// print("hidden")\n'
  const output = []
  vm.runInNewContext(compile(source), { console: { log: item => output.push(item) } })
  assert.deepEqual(output, ['if func end // "quoted"'])
})

test('malformed input and unsupported features fail with precise positions', context => {
  const { compile } = loadCompiler(context, bootstrapSource)
  for (const [source, error] of [
    ['func bad():\n print(1)', /Expected end at 2:10/],
    ['if true:\n print(1)\nend\nend', /Unexpected end at 4:1/],
    ['print(1 + )', /Expected expression at 1:11/],
    ['match value:\nend', /Unsupported syntax match at 1:1/],
    ['print(item.is_type)', /Unsupported property is_type at 1:11/]
  ]) assert.throws(() => compile(source), error)
})

test('self-hosted compiler agrees on fixtures and its own sources', context => {
  const first = loadCompiler(context, bootstrapSource)
  const second = loadCompiler(context, first.compile)
  const fixtures = [
    'const result = 2 + 3 * (4 - 1)\nprint(result)',
    'func greet(value):\n if value > 2:\n  print("end elif")\n else:\n  print("other")\n end\nend\ngreet(3)',
    'for const item of [1, 2]:\n print(item)\nend',
    'handle:\n throw new Err("oops")\nrecovery (error):\n print(error.message)\nend'
  ]
  for (const source of [...sources(), ...fixtures]) {
    assert.equal(first.compile(source), second.compile(source))
  }
  assert.match(first.compile('print("print(hello) if x:")'), /console\.log\("print\(hello\) if x:"\)/)
})

test('generated compiler accepts every CLI source', context => {
  const { compile } = loadCompiler(context, bootstrapSource)
  for (const name of ['index', 'bsr', 'bst', 'bsp', 'bsd', 'translate']) {
    const source = fs.readFileSync(path.join(root, 'src', `${name}.bs`), 'utf8')
    assert.doesNotThrow(() => new vm.Script(compile(source), { filename: `${name}.js` }))
  }
})

test('CLI rejects malformed input without writing partial output', context => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bynix-errors-'))
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  fs.writeFileSync(path.join(directory, 'broken.bys'), 'if true:\n print(1)')
  const result = spawnSync(process.execPath, [path.join(root, 'dist/index.min.cjs'), 'compile', 'broken.bys'], {
    cwd: directory, encoding: 'utf8'
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Expected end at 2:10/)
  assert.equal(fs.existsSync(path.join(directory, 'broken.js')), false)
})

test('browser bundle uses the same compiler for inline sources', context => {
  let ready
  const messages = []
  const tag = {
    textContent: 'print("browser")',
    getAttribute: () => null,
    remove: () => messages.push('removed')
  }
  const sandbox = {
    document: {
      addEventListener: (_, callback) => { ready = callback },
      querySelectorAll: () => [tag]
    },
    console: { log: message => messages.push(message), error: error => { throw error } }
  }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/browser.js'), 'utf8'), sandbox)
  ready()
  assert.deepEqual(messages, ['browser', 'removed'])
})
