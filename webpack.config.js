var webpack = require('webpack');
const path = require('path');

module.exports = function (env) {
  const config = {
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
        BoardAPI: path.resolve(__dirname, 'client/model/boardapi'),
        SiteAPI:  path.resolve(__dirname, 'client/model/siteapi')
      },
      extensions: ['.js', '.jsx', '.css']
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
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
        },
        {
          test: /\.scss$/,
          use: ["style-loader", "css-loader", "sass-loader" ]
        }
      ]
    },
    devtool: 'cheap-module-eval-source-map'
  };

  if (env.demo) {
    config.output.filename = './demo/static/bundle.js';
    config.resolve.alias = {
        BoardAPI: path.resolve(__dirname, 'client/model/demoboardapi'),
        SiteAPI:  path.resolve(__dirname, 'client/model/demositeapi')
    };
  }

  return config;
};
