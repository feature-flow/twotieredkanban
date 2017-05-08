var webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: [
    'script-loader!jquery/dist/jquery.min.js',
    //'script!foundation-sites/dist/js/foundation.min.js',
    './client/app.jsx'
    ],
  externals: {
    jquery: 'jQuery'
  },
  plugins: [
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery'
    })
  ],
  output: {
    path: __dirname,
    filename: './static/bundle.js'
  },
  resolve: {
          modules: ['node_modules',
              path.resolve(__dirname, 'client/ui'),
              path.resolve(__dirname, 'client/model')],
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
