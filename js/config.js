const fs = require('node:fs');

function loadConfig(filename, primary) {
  const defaultConfig = {
    extension: { primary, secondary: '.bynixscript', module: '.mbs' },
    readFolder: './', toFolder: './', watch: false,
    allowJs: false, strict: false, translate: 'javascript'
  }
  var config
  try {
    config = JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    config = defaultConfig;
  }
  const extensions = {
    primary: config.extension?.primary || defaultConfig.extension.primary,
    secondary: config.extension?.secondary || defaultConfig.extension.secondary,
    module: config.extension?.module || defaultConfig.extension.module
  }
  return {
    defaultConfig, config, extensions,
    readFolder: config.readFolder || defaultConfig.readFolder,
    toFolder: config.toFolder || defaultConfig.toFolder,
    watch: config.watch || defaultConfig.watch,
    allowJs: config.allowJs || defaultConfig.allowJs,
    strict: config.strict || defaultConfig.strict,
    translate: config.translate || defaultConfig.translate
  }
}

module.exports = { loadConfig }
