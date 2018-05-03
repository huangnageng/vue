import Vue from 'vue'
import router from '../../router/router.js'
import comm from '@/api/comm.js'
import store from '../../store'
import App from '../../components/filter/mode.vue'
import YDUI from 'vue-ydui'
import 'vue-ydui/dist/ydui.rem.css'

// 引入VUE YDUI
Vue.use(YDUI)
// 引入弹窗组件
Vue.use(comm)
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
