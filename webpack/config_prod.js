// inspired by https://github.com/salsita/chrome-extension-skeleton/blob/master/webpack/webpack.config.prod.js

const path = require('path');

const Crx = require('crx-webpack-plugin');

const pkg = require('../package.json');

const appName = `${pkg.name}-${pkg.version}`;

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popupLoad.js',
    options: './src/optionsLoad.js',
    pageRelay: './src/pageRelay.js',
  },
  performance: {
    // Suppress: asset(s) exceed the recommended size limit: popup.js.
    // The protobuf stuff is outsized, but there's no benefit to
    // lazy-loading it.
    hints: false
  },
  output: {
    path: path.resolve(__dirname, '../dist')
  },
  plugins: [
    new Crx({
      keyFile: '../.ssh/RSign-dckc.pem',
      contentPath: '../dist/',
      outputPath: '../dist/',
      name: appName,
    })
  ]
};
