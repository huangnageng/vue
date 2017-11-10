export default {
  // loading的显示
  isLoading (state, { isLoading }) {
    state.comm.isLoading = isLoading
  },
  // 数据加载中
  isLoadMore (state, { isLoadMore }) {
    state.comm.loadMore = isLoadMore
  },
  // 过场动画的效果
  updateDirection (state, { direction }) {
    state.comm.direction = direction
  },
  // 设置header参数
  changeIndexConf (state, data) {
    Object.assign(state.comm.indexConf, data)
  }
  /**
   * 业务--------------------------------------------
   */
  // 设置服务器时间

}
