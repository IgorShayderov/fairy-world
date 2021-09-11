const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, options) => {
  return {
    devServer: {
      client: {
        overlay: true,
        progress: true,
      },
      compress: true,
      static: {
        directory: path.join(__dirname, 'public'),
        watch: true,
      },
    },
    devtool: process.env.NODE_ENV === 'development' ? 'eval-cheap-module-source-map' : false,
    entry: './src/index.ts',
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            'babel-loader',
          ],
        },
        {
          test: /\.scss$/,
          use: [
            'style-loader',
            'css-loader',
            'sass-loader',
          ],
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    },
    plugins: [new HtmlWebpackPlugin({ template: './public/app.html' })],
  };
};
