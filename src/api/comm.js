/* 公用引入 */
// import { ConfirmPlugin, ToastPlugin, AlertPlugin, LoadingPlugin } from 'vux'
// import mixins from '../mixins'
import base from './base'

export default (Vue) => {
  const FastClick = require('fastclick')
  FastClick.attach(document.body)
  // Vue.use(ConfirmPlugin)
  // Vue.use(ToastPlugin)
  // Vue.use(AlertPlugin)
  // Vue.use(LoadingPlugin)
  // 注册全局mixins
  // Vue.mixin(mixins)
  Vue.prototype.base = base
}
