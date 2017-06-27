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
        SiteAPI:  path.resolve(__dirname, 'client/model/siteapi'),
        AuthUI:   path.resolve(__dirname, 'client/emailpw/ui'),
        Intro:   path.resolve(__dirname, 'client/ui/intro')
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
            // has separate config, see postcss.config.js nearby
            "postcss-loader"
          ]
        },
        {
          test: /\.scss$/,
          use: ["style-loader", "css-loader", "sass-loader" ]
        },
        {
          test: /\.html$/,
          use: ["html-loader"]
        },
        { test: /\.json$/, use: ["json-loader"] }
      ]
    },
    devtool: 'cheap-module-eval-source-map'
  };

  if (env && env.prod) {
    config.devtool = 'source-map';
    config.plugins = [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production')
        }
      }),
      new webpack.optimize.UglifyJsPlugin({sourceMap: true})
    ];
  }

  if (env && env.demo) {
    if (env.prod) {
      config.output.filename = './prod/bundle.js';
    }
    else {
      config.output.filename = './demo/static/bundle.js';
    }
    config.resolve.alias = {
      indexedDB: path.resolve(__dirname, 'client/demo/indexeddb'),
      BoardAPI:  path.resolve(__dirname, 'client/demo/boardapi'),
      SiteAPI:   path.resolve(__dirname, 'client/demo/siteapi'),
      AuthUI:    path.resolve(__dirname, 'client/demo/ui'),
      Intro:    path.resolve(__dirname, 'client/demo/intro')
    };
  }

  return config;
};
