var webpack = require('webpack');
const path = require('path');
var nodeExternals = require('webpack-node-externals');
 
module.exports = {
  target: 'node',
  externals: [nodeExternals()],
  resolve: {
    modules: ['node_modules'],
    alias: {
      indexedDB: 'fake-indexeddb',
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
      }
    ]
  }
};

// module.exports = function (env) {
//   const config = {
//     resolve: {
//       modules: ['node_modules'],
//       alias: {
//         BoardAPI: path.resolve(__dirname, 'client/model/boardapi'),
//         SiteAPI:  path.resolve(__dirname, 'client/model/siteapi')
//       },
//       extensions: ['.js', '.jsx', '.css']
//     },
//     devtool: 'cheap-module-eval-source-map'
//   };
// };
