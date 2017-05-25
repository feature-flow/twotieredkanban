var webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: [
    './client/app.jsx'
    ],
  output: {
    path: __dirname,
    filename: './static/bundle.js'
  },
  resolve: {
    modules: ['node_modules'],
    alias: {
        applicationStyles: path.resolve(__dirname, 'client/styles/app.scss')
    },
      extensions: ['.js', '.jsx', '.css']
  },
  module: {
    loaders: [
      {
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015']
        },
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/
      },
      {
          test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
              localIdentName: "[name]--[local]--[hash:base64:8]"
            }
          },
          "postcss-loader" // has separate config, see postcss.config.js nearby
        ]
      }
    ]
  },
  devtool: 'cheap-module-eval-source-map'
};
