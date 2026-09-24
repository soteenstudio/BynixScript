const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

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
