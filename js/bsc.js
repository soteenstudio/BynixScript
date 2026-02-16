const fs = require('fs');

const defaultConfig = {
  extension: {
    primary: '.bys',
    secondary: '.bynixscript',
    module: '.mbs'
  },
  readFolder: './',
  toFolder: './',
  watch: false,
  allowJs: false,
  strict: false,
  translate: 'javascript'
};

let config;

try {
  const data = fs.readFileSync('./bsc.json', 'utf8');
  config = JSON.parse(data);
} catch (err) {
  config = defaultConfig;
}

const extensions = {
  primary: config.extension?.primary || defaultConfig.extension.primary,
  secondary: config.extension?.secondary || defaultConfig.extension.secondary,
  module: config.extension?.module || defaultConfig.extension.module
};

const readFolder = config.readFolder || defaultConfig.readFolder;
const toFolder = config.toFolder || defaultConfig.toFolder;
const watch = config.watch || defaultConfig.watch;
const allowJs = config.allowJs || defaultConfig.allowJs;
const strict = config.strict || defaultConfig.strict;
const translate = config.translate || defaultConfig.translate;

module.exports = { defaultConfig, config, extensions, toFolder, readFolder, watch, allowJs, strict, translate };
