import Vue from 'vue'
import Vuex from 'vuex'
import mutations from './mutations'
import * as actions from './actions'
import * as getters from './getters'
// import modules from './modules'
Vue.use(Vuex)

// 应用初始状态
const state = {
  comm: {
    isLoading: false
  }
}
export default new Vuex.Store({
  state,
  mutations,
  actions,
  getters
})
