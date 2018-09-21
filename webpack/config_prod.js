const path = require('path');

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
  }
};
