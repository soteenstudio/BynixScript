const { parsing, parsingMsg, parseCode, addSemicolons } = require('bynixscript/js/parser.js')
const replacements = require('bynixscript/dist/parser/parsingDecl.js')
const bootstrapVersion = '0.2.1-next'
if (require('bynixscript/package.json').version !== bootstrapVersion) {
  throw new Error(`Bootstrap compiler must be bynixscript@${bootstrapVersion}`)
}

const passes = [
  'flowReplace', 'utilityReplace', 'funcReplace', 'condReplace',
  'forEachReplace', 'reassignReplace', 'assignReplace', 'logReplace',
  'interactReplace', 'mathReplace', 'commentReplace', 'asyncReplace',
  'forReplace', 'convReplace', 'checkReplace', 'oopReplace',
  'excepReplace', 'domReplace'
]

function compileSource(source) {
  const literals = []
  const protectedSource = source.replace(/(?:`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, literal => {
    const placeholder = `__BYNIX_LITERAL_${literals.length}__`
    literals.push(literal)
    return placeholder
  })
  let code = addSemicolons(parseCode(protectedSource))
  if (parsing(code) === false) {
    throw new Error(parsingMsg.message)
  }
  for (const pass of passes) {
    code = replacements[pass](code)
  }
  return code.replace(/__BYNIX_LITERAL_(\d+)__/g, (_, index) => literals[Number(index)])
}

module.exports = { compileSource }
