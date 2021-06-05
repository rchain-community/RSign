const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  watch: true,
  entry: {
    popup: './src/popupLoad.js',
    options: './src/optionsLoad.js',
    pageRelay: './src/pageRelay.js',
  },
  output: { path: path.resolve(__dirname, '../dist') },
};
