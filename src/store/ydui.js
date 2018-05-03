import Vue from 'vue'
import YDUI from 'vue-ydui'
import 'vue-ydui/dist/ydui.rem.css'
import { Button, ButtonGroup } from 'vue-ydui/dist/lib.rem/button'
/* 使用px：import {Button, ButtonGroup} from 'vue-ydui/dist/lib.px/button'; */
import {
  NavBar,
  NavBarBackIcon,
  NavBarNextIcon
} from 'vue-ydui/dist/lib.rem/navbar'
import { TabBar, TabBarItem } from 'vue-ydui/dist/lib.rem/tabbar'
Vue.component(Button.name, Button)
Vue.component(ButtonGroup.name, ButtonGroup)
Vue.component(NavBar.name, NavBar)
Vue.component(NavBarBackIcon.name, NavBarBackIcon)
Vue.component(NavBarNextIcon.name, NavBarNextIcon)
Vue.component(TabBar.name, TabBar)
Vue.component(TabBarItem.name, TabBarItem)

Vue.use(Vue)
// 引入VUE YDUI
Vue.use(YDUI)

new Vue({
  render: h => h(App)
}).$mount('#app')
// export default new Vue.Store({
//   state,
//   mutations,
//   actions,
//   getters
// })
