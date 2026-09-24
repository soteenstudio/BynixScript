const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { Script, runInNewContext } = require('node:vm')
const { compileSource } = require('../scripts/compile.cjs')

const root = path.resolve(__dirname, '..')
const binary = path.join(root, 'dist', 'index.min.cjs')

function invoke(args, cwd = root) {
  return spawnSync(process.execPath, [binary, ...args], { cwd, encoding: 'utf8' })
}

function fixture(context) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bynix-cli-'))
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  return directory
}

test('build produces the packaged executable', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.cjs')], {
    cwd: root, encoding: 'utf8'
  })
  assert.equal(result.status, 0, result.stderr)
  assert.ok(fs.statSync(binary).isFile())
  assert.match(fs.readFileSync(binary, 'utf8'), /^#!\/usr\/bin\/env node/)
  assert.equal(invoke(['--version']).status, 0)
})

test('every CLI source compiles through the build compiler', () => {
  for (const name of ['index', 'bsr', 'bst', 'bsp', 'bsd', 'translate']) {
    const source = fs.readFileSync(path.join(root, 'src', `${name}.bs`), 'utf8')
    const code = compileSource(source)
    assert.match(source, /\bfunc \w+\(|\bhandle:/)
    assert.doesNotMatch(source, /\bfunction\s+\w+\s*\(|\btry\s*\{/)
    assert.match(code, /function \w+\(|try \{/)
    assert.doesNotThrow(() => new Script(code, { filename: `${name}.js` }))
  }
  assert.match(compileSource('func valid(value):\n  print(value)\nend'), /function valid\(value\) \{/)
  assert.throws(() => new Script(compileSource('func invalid():\n  print("x")\n')), SyntaxError)
})

test('bootstrap compiler preserves quoted and template text while translating code', () => {
  const source = [
    "const single = 'func print(1) is_end(\"x\") # \\'quoted\\''",
    'const double = "handle: print(2) rand(3) \\"quoted\\""',
    'const template = `first print(3) # **',
    'end \\`escaped\\` ${single} ${`nested print(4) ${double}`}`',
    'const interpolated = `print(5) ${"needle".is_includes("need")}`',
    'func show():',
    '  print(single, double, template, interpolated)',
    'end',
    'show()'
  ].join('\n')
  const output = compileSource(source)
  assert.match(output, /function show\(\) \{/)
  for (const literal of [
    "'func print(1) is_end(\"x\") # \\'quoted\\''",
    '"handle: print(2) rand(3) \\"quoted\\""',
    '`first print(3) # **\nend \\`escaped\\` ${single} ${`nested print(4) ${double}`}`',
    '`print(5) ${"needle".includes("need")}`'
  ]) {
    assert.ok(output.includes(literal), `Missing unchanged literal: ${literal}`)
  }
  const values = []
  runInNewContext(output, { console: { log: (...args) => values.push(args) } })
  assert.deepEqual(values, [[
    "func print(1) is_end(\"x\") # 'quoted'",
    'handle: print(2) rand(3) "quoted"',
    'first print(3) # **\nend `escaped` func print(1) is_end("x") # \'quoted\' nested print(4) handle: print(2) rand(3) "quoted"',
    'print(5) true'
  ]])
})

test('bootstrap compiler preserves line and block comments without executing their contents', () => {
  const source = [
    'const events = []',
    '# print("from hash") func hidden():',
    '// print("from slash") is_end("x")',
    '/* print("from block")',
    'end func hidden(): */',
    '** print("from dialect block")',
    'end is_includes("x") **',
    'events.push("safe")',
    'print(events.join(","))'
  ].join('\n')
  const output = compileSource(source)
  for (const comment of [
    '// print("from hash") func hidden():',
    '// print("from slash") is_end("x")',
    '/* print("from block")\nend func hidden(): */',
    '/* print("from dialect block")\nend is_includes("x") */'
  ]) {
    assert.ok(output.includes(comment), `Missing unchanged comment: ${comment}`)
  }
  const values = []
  runInNewContext(output, { console: { log: value => values.push(value) } })
  assert.deepEqual(values, ['safe'])
})

test('packaged compiler preserves literals and ignores comments', context => {
  const directory = fixture(context)
  const source = [
    'const value = `print(1) # \\`quoted\\`',
    'end ${"func is_end(2)"}`',
    '# print("unsafe hash")',
    '/* print("unsafe block")',
    'end */',
    'print(value)'
  ].join('\n')
  fs.writeFileSync(path.join(directory, 'protected.bys'), source)
  const compilation = invoke(['compile', 'protected.bys'], directory)
  assert.equal(compilation.status, 0, compilation.stderr)
  const output = fs.readFileSync(path.join(directory, 'protected.js'), 'utf8')
  assert.ok(output.includes('`print(1) # \\`quoted\\`\nend ${"func is_end(2)"}`'))
  assert.ok(output.includes('// print("unsafe hash")'))
  assert.ok(output.includes('/* print("unsafe block")\nend */'))
  const result = invoke(['run', 'protected.bys'], directory)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), 'print(1) # `quoted`\nend func is_end(2)')
  assert.doesNotMatch(result.stdout, /unsafe/)
})

test('global and command help succeeds', () => {
  assert.match(invoke(['--help']).stdout, /run <file>/)
  for (const command of ['run', 'compile', 'print', 'delete']) {
    const result = invoke([command, '--help'])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, new RegExp(`bynix ${command} .*<file>`))
  }
})

test('run executes a source file without writing JavaScript', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'hello.bys'),
    'func greet():\n  print("hello from run")\nend\ngreet()\n')
  const result = invoke(['run', 'hello.bys'], directory)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /hello from run/)
  assert.equal(fs.existsSync(path.join(directory, 'hello.js')), false)
})

test('run reports runtime failures with a nonzero status', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'broken.bys'), 'missingFunction()\n')
  const result = invoke(['run', 'broken.bys'], directory)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /missingFunction is not defined/)
})

test('compile writes JavaScript without executing source code', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'hello.bynixscript'), 'print("not executed")\n')
  const result = invoke(['compile', 'hello.bynixscript'], directory)
  assert.equal(result.status, 0, result.stderr)
  assert.doesNotMatch(result.stdout, /not executed/)
  assert.match(fs.readFileSync(path.join(directory, 'hello.js'), 'utf8'), /console\.log\("not executed"\)/)
  fs.writeFileSync(path.join(directory, 'module.mbs'), 'print("module")\n')
  assert.equal(invoke(['compile', 'module.mbs'], directory).status, 0)
  assert.ok(fs.existsSync(path.join(directory, 'module.mjs')))
})

test('print translates without executing or writing a file', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'hello.bys'), 'print("print only")\n')
  const result = invoke(['print', 'hello.bys'], directory)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /console\.log\("print only"\)/)
  assert.doesNotMatch(result.stdout, /^print only$/m)
  assert.equal(fs.existsSync(path.join(directory, 'hello.js')), false)
})

test('delete only removes the specified file', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'remove.bys'), 'print("bye")\n')
  fs.writeFileSync(path.join(directory, 'keep.bys'), 'print("stay")\n')
  const result = invoke(['delete', 'remove.bys'], directory)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(fs.existsSync(path.join(directory, 'remove.bys')), false)
  assert.ok(fs.existsSync(path.join(directory, 'keep.bys')))
})

test('missing arguments never delete a file and return failure', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'undefined.bys'), 'safe')
  for (const command of ['run', 'compile', 'print', 'delete']) {
    const result = invoke([command], directory)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /missing required argument/)
  }
  assert.notEqual(invoke([], directory).status, 0)
  assert.notEqual(invoke(['-d'], directory).status, 0)
  assert.ok(fs.existsSync(path.join(directory, 'undefined.bys')))
})

test('invalid paths and extensions return errors for every command', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'invalid.txt'), 'safe')
  for (const command of ['run', 'compile', 'print', 'delete']) {
    const missing = invoke([command, 'absent.bys'], directory)
    assert.notEqual(missing.status, 0)
    assert.match(missing.stderr, /File not found/)
    const extension = invoke([command, 'invalid.txt'], directory)
    assert.notEqual(extension.status, 0)
    assert.match(extension.stderr, /Unsupported file extension/)
  }
  assert.ok(fs.existsSync(path.join(directory, 'invalid.txt')))
})

test('legacy file options still work', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'legacy.bys'), 'print("legacy")\n')
  assert.match(invoke(['-r', 'legacy.bys'], directory).stdout, /legacy/)
  assert.match(invoke(['-p', 'legacy.bys'], directory).stdout, /console\.log/)
  assert.equal(invoke(['-c', 'legacy.bys'], directory).status, 0)
  assert.ok(fs.existsSync(path.join(directory, 'legacy.js')))
  assert.equal(invoke(['-d', 'legacy.bys'], directory).status, 0)
  assert.equal(fs.existsSync(path.join(directory, 'legacy.bys')), false)
})

test('conflicting legacy commands fail without changing files', context => {
  const directory = fixture(context)
  fs.writeFileSync(path.join(directory, 'safe.bys'), 'print("safe")\n')
  const result = invoke(['-p', 'safe.bys', '-d', 'safe.bys'], directory)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Specify only one command/)
  assert.ok(fs.existsSync(path.join(directory, 'safe.bys')))
})
