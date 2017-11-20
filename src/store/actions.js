import base from '../api/base'
// *-------------------------------------------游戏商城接口-------------------------------------------------------------*/
// 获取商城主页数据
export const GetMain = ({ commit, state, dispatch }, params) => {
  return base.GetMain(params).then((res) => {
    if (res !== undefined && res.hasOwnProperty('status') && res.data.status === 200) {
      return { data: res.data.data, status: 200 }
    } else {
      return res !== undefined ? { message: res.message, status: res.status } : { status: 500 }
    }
  }).catch(e => {
    console.log(e)
  })
}
// 获取游戏单位详情
export const GetGameDir = ({ commit, state, dispatch }, params) => {
  return base.GetGameDir(params).then((res) => {
    if (res !== undefined && res.hasOwnProperty('status') && res.data.status === 200) {
      return { data: res.data.data, status: 200 }
    } else {
      return res !== undefined ? { message: res.message, status: res.status } : { status: 500 }
    }
  }).catch(e => {
    console.log(e)
  })
}
// 获取书籍章节内容接口
export const GetBookDetail = ({ commit, state, dispatch }, params) => {
  return base.GetBookDetail(params).then((res) => {
    if (res !== undefined && res.hasOwnProperty('status') && res.data.status === 200) {
      return { data: res.data.data, status: 200 }
    } else {
      return res !== undefined ? { message: res.message, status: res.status } : { status: 500 }
    }
  }).catch(e => {
    console.log(e)
  })
}
// *-------------------------------------------游戏商城接口-------------------------------------------------------------*/
