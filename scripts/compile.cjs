const { parsing, parsingMsg, parseCode, addSemicolons } = require('bynixscript/js/parser.js')
const replacements = require('bynixscript/dist/parser/parsingDecl.js')

const passes = [
  'flowReplace', 'utilityReplace', 'funcReplace', 'condReplace',
  'forEachReplace', 'reassignReplace', 'assignReplace', 'logReplace',
  'interactReplace', 'mathReplace', 'commentReplace', 'asyncReplace',
  'forReplace', 'convReplace', 'checkReplace', 'oopReplace',
  'excepReplace', 'domReplace'
]

function compileSource(source) {
  let code = addSemicolons(parseCode(source))
  if (parsing(code) === false) {
    throw new Error(parsingMsg.message)
  }
  for (const pass of passes) {
    code = replacements[pass](code)
  }
  return code
}

module.exports = { compileSource }
