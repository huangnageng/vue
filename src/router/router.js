import Vue from 'vue'
import VueRouter from 'vue-router'
import IndexChild from '../module/index/router.js'
Vue.use(VueRouter)
const App = resolve => require(['../components/App.vue'], resolve)
const routes = [
  {
    path: '/',
    meta: {
      name: '首页'
    },
    component: App,
    children: IndexChild
  }
]

const router = new VueRouter({
  mode: 'history',
  routes: routes// （缩写）相当于 routes: routes
})
router.afterEach((e) => {
  console.log(e)
})
export default router
