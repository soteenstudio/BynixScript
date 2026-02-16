const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { parsing, parsingMsg, parseCode } = require('./parser.js')
const { funcReplace, condReplace, forEachReplace, reassignReplace, assignReplace, logReplace, interactReplace, mathReplace, domReplace, commentReplace, utilityReplace, asyncReplace, flowReplace, forReplace, convReplace, checkReplace, oopReplace, excepReplace, otherReplace } = require('../raw/parser/parsingDecl.js')

function watching(directory, directory2) {
  let code;
  
  const watcher = chokidar.watch(directory, {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });
  
  watcher
    .on('add', filePath => {
      code = fs.readFileSync(filePath, 'utf8');
      code = parseCode(code);
      const parsingResults = parsing(code);
      if (parsingResults === false) {
        console.log("Please check your code and try again.")
      } else {
        code = flowReplace(code)
        code = utilityReplace(code)
        code = funcReplace(code)
        code = condReplace(code)
        code = forEachReplace(code)
        code = reassignReplace(code)
        code = assignReplace(code)
        code = logReplace(code)
        code = interactReplace(code)
        code = mathReplace(code)
        code = commentReplace(code)
        code = asyncReplace(code)
        code = forReplace(code)
        code = convReplace(code)
        code = checkReplace(code)
        code = oopReplace(code)
        code = excepReplace(code)
        code = domReplace(code)
        var newFilePath = path.join(directory2, path.basename(filePath));
        newFilePath = newFilePath.replace(".bs", ".js");
        fs.writeFileSync(newFilePath, code);
        
        console.log(`File ${newFilePath} has been created.`);
      }
    })
    .on('change', filePath => {
      code = fs.readFileSync(filePath, 'utf8');
      code = parseCode(code);
      const parsingResults = parsing(code);
      if (parsingResults === false) {
        console.log("Please check your code and try again.")
      } else {
        code = flowReplace(code)
        code = utilityReplace(code)
        code = funcReplace(code)
        code = condReplace(code)
        code = forEachReplace(code)
        code = reassignReplace(code)
        code = assignReplace(code)
        code = logReplace(code)
        code = interactReplace(code)
        code = mathReplace(code)
        code = commentReplace(code)
        code = asyncReplace(code)
        code = forReplace(code)
        code = convReplace(code)
        code = checkReplace(code)
        code = oopReplace(code)
        code = excepReplace(code)
        code = domReplace(code)
        var newFilePath = path.join(directory2, path.basename(filePath));
        newFilePath = newFilePath.replace(".bs", ".js");
        fs.writeFileSync(newFilePath, code);
        
        console.log(`File ${newFilePath} has been changed.`);
      }
    })
    .on('unlink', filePath => {
      var newFilePath = path.join(directory2, path.basename(filePath));
      newFilePath = newFilePath.replace(".bs", ".js");
      fs.unlinkSync(newFilePath);
      
      console.log(`File ${newFilePath} has been deleted.`);
    });
  
  watcher
    .on('error', error => console.log(`Watcher error: ${error}`))
    .on('ready', () => console.log('Initial scan complete. Ready for changes'));
}

module.exports = { watching };