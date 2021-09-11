const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, options) => {
  console.log(env, 'env')
  console.log(options, 'options')
  console.log(process.env.NODE_ENV, 'NODE_ENV')
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
    devtool: process.env.NODE_ENV === 'development' ? 'inline-source-map' : false,
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
