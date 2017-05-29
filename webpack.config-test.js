var webpack = require('webpack');
const path = require('path');
var nodeExternals = require('webpack-node-externals');
 
module.exports = {
  target: 'node',
  externals: [nodeExternals()],
  resolve: {
    modules: ['node_modules'],
    alias: {
      indexedDB: 'fake-indexeddb'
    },
    extensions: ['.js', '.jsx', '.css']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['react', 'es2015']
            }
          }
        ]
      },
      { test: /\.json$/, use: ["json-loader"] }
    ]
  },
  output: {
    // sourcemap support for IntelliJ/Webstorm 
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
  },
  devtool: "cheap-module-source-map"
};
