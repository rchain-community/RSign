const { assert } = require('console');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  watch: true,
  entry: {
    popup: './src/popupLoad.js',
    options: './src/optionsLoad.js',
    pageRelay: './src/pageRelay.js',
    ethProvider: './src/ethProvider.js', // TODO: add to prod too
  },
  resolve: {
    fallback: {
      // stub assert since npm package wants process (!?)
      "assert": require.resolve('../src/assert.js'),
      "stream": require.resolve("stream-browserify"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  output: { path: path.resolve(__dirname, '../dist') },
};
