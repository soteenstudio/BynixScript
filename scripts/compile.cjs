const { parsing, parsingMsg, parseCode, addSemicolons } = require('bynixscript/js/parser.js')
const replacements = require('bynixscript/dist/parser/parsingDecl.js')

const passes = [
  'flowReplace', 'utilityReplace', 'funcReplace', 'condReplace',
  'forEachReplace', 'reassignReplace', 'assignReplace', 'logReplace',
  'interactReplace', 'mathReplace', 'commentReplace', 'asyncReplace',
  'forReplace', 'convReplace', 'checkReplace', 'oopReplace',
  'excepReplace', 'domReplace'
]

function protectSource(source) {
  let prefix = 'BYNIXPROTECTED'
  while (source.includes(prefix)) prefix += 'X'
  const protectedText = []
  let position = 0

  function mask(text) {
    if (!text) return ''
    const token = `${prefix}${protectedText.length}TOKEN`
    protectedText.push(text)
    return token
  }

  function quoted(quote) {
    const start = position++
    while (position < source.length) {
      if (source[position] === '\\') {
        position += 2
      } else if (source[position++] === quote) {
        break
      }
    }
    return mask(source.slice(start, position))
  }

  function template() {
    let start = position++
    let output = ''
    while (position < source.length) {
      if (source[position] === '\\') {
        position += 2
      } else if (source.startsWith('${', position)) {
        output += mask(source.slice(start, position)) + '${'
        position += 2
        output += code('}')
        start = position
      } else if (source[position++] === '`') {
        return output + mask(source.slice(start, position))
      }
    }
    return output + mask(source.slice(start, position))
  }

  function code(terminator) {
    let output = ''
    let depth = 0
    while (position < source.length) {
      const character = source[position]
      if (character === terminator && depth === 0) {
        position++
        return output + character
      }
      if (character === '"' || character === "'") {
        output += quoted(character)
      } else if (character === '`') {
        output += template()
      } else if (source.startsWith('//', position) || (character === '#' && !source.startsWith('#!', position))) {
        const start = position
        while (position < source.length && source[position] !== '\n') position++
        const text = source.slice(start, position)
        output += mask(character === '#' ? `//${text.slice(1)}` : text)
      } else if (source.startsWith('/*', position) || source.startsWith('**', position)) {
        const dialect = character === '*'
        const start = position
        const end = source.indexOf(dialect ? '**' : '*/', position + 2)
        position = end === -1 ? source.length : end + 2
        const text = source.slice(start, position)
        output += mask(dialect ? `/*${text.slice(2, -2)}*/` : text)
      } else {
        if (character === '{') depth++
        if (character === '}') depth--
        output += character
        position++
      }
    }
    return output
  }

  const masked = code()
  const token = new RegExp(`${prefix}(\\d+)TOKEN`, 'g')
  return { masked, restore: text => text.replace(token, (match, index) => protectedText[Number(index)]) }
}

function compileSource(source, allowJs = false) {
  const { masked, restore } = protectSource(source)
  let code = addSemicolons(parseCode(masked))
  if (!allowJs && parsing(code) === false) {
    throw new Error(parsingMsg.message)
  }
  for (const pass of passes) {
    code = replacements[pass](code)
  }
  return restore(code)
}

module.exports = { compileSource }
