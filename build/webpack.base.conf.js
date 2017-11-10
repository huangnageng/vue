'use strict'
const path = require('path')
const utils = require('./utils')
const config = require('../config')
const vueLoaderConfig = require('./vue-loader.conf')
const vuxLoader = require('vux-loader')
var glob = require('glob'); // 使用glob -- 匹配规则
var entries = getEntry('./src/module/**/*.js'); // 获得入口js文件
function resolve(dir) {
  return path.join(__dirname, '..', dir)
}
/** 多入口配置函数，获取入口html 及js文件地址 */
function getEntry(globPath) {
  var entries = {},
    basename, tmp, pathname;

  glob.sync(globPath).forEach(function(entry) {

    basename = path.basename(entry, path.extname(entry));
    tmp = entry.split('/').splice(-3);
    console.log('tmp:' + tmp)
    pathname = tmp.splice(0, 1) + '/' + basename; // 正确输出js和html的路径
    console.log('basename:' + basename)
    entries[pathname] = entry;
  });
  console.log("base-entrys:");
  console.log(entries);
  return entries;
}

let originalConfig  = {
  entry: entries,
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production' ?
      config.build.assetsPublicPath : config.dev.assetsPublicPath
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      '@': resolve('src'),
    }
  },
  module: {
    rules: [{
        test: /\.(js|vue)$/,
        loader: 'eslint-loader',
        enforce: 'pre',
        include: [resolve('src'), resolve('test')],
        options: {
          formatter: require('eslint-friendly-formatter')
        }
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderConfig
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [resolve('src'), resolve('test')]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('media/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('fonts/[name].[hash:7].[ext]')
        }
      }
    ]
  }
}
const webpackConfig = originalConfig 
module.exports = vuxLoader.merge(webpackConfig, {
  plugins: ['vux-ui',{
    name: 'less-theme',
    path: 'src/style/theme.less'
  }]
})