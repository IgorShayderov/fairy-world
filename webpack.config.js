const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devServer: {
    static: './dist'
  },
  entry: './src/index.js',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.scss$/i,
        use: [
            'style-loader',
            'css-loader',
            'sass-loader',
          ]
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  plugins: [new HtmlWebpackPlugin({ template: './public/app.html' })],
};
