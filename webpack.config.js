const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

const { NODE_ENV } = process.env;

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
    devtool: NODE_ENV === 'development' ? 'eval-cheap-module-source-map' : false,
    entry: './src/index.ts',
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.vue$/,
          use: [
            'vue-loader',
          ],
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
          },
          exclude: /node_modules/,
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
    plugins: [
      new HtmlWebpackPlugin({ template: './public/app.html' }),
      new VueLoaderPlugin(),
    ],
    resolve: {
      alias: {
        '@src': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
      },
      extensions: ['.ts', '.js', '.vue'],
    },
  };
};
