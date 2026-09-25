const chokidar = require('chokidar');
const fs = require('node:fs');
const path = require('node:path');
const { compileSource } = require('../scripts/compile.cjs');

function watching(directory, directory2) {
  const watcher = chokidar.watch(directory, { ignored: /(^|[\/\\])\../, persistent: true });
  const extensions = ['.bs', '.bys', '.bynixscript', '.mbs'];
  function outputPath(filePath) {
    const extension = path.extname(filePath);
    if (!extensions.includes(extension)) {
      return null
    }
    return path.join(directory2, path.basename(filePath, extension) + (extension === '.mbs' ? '.mjs' : '.js'));
  }
  function compileFile(filePath) {
    const output = outputPath(filePath);
    if (!output) {
      return;
    }
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      const code = compileSource(source);
      fs.writeFileSync(output, code);
      console.log(`File ${output} has been created or changed.`)
    } catch (error) {
      console.error(`Error compiling ${filePath}:`, error)
    }
  }
  function removeFile(filePath) {
    const output = outputPath(filePath);
    if (output && fs.existsSync(output)) {
      fs.unlinkSync(output);
      console.log(`File ${output} has been deleted.`)
    }
  }
  watcher.on('add', compileFile).on('change', compileFile).on('unlink', removeFile);
  watcher.on('error', error => console.error('Watcher error:', error));
  watcher.on('ready', () => console.log('Initial scan complete. Ready for changes'));
  return watcher
}

module.exports = { watching }
