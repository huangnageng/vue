// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import router from '../../router/router.js'
import comm from '@/api/comm.js'
import store from '../../store'
import App from '../../components/index/mode.vue'
// 引入弹窗组件
Vue.use(comm)
Vue.config.productionTip = false
  /* eslint-disable no-new */
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
