import base from '../api/base'
// *-------------------------------------------小说阅读接口-------------------------------------------------------------*/
// 获取书籍信息接口
export const GetBookInfo = ({ commit, state, dispatch }, params) => {
  return base.GetBookInfo(params).then((res) => {
    if (res !== undefined && res.hasOwnProperty('status') && res.data.status === 200) {
      return { data: res.data.data, status: 200 }
    } else {
      return res !== undefined ? { message: res.message, status: res.status } : { status: 500 }
    }
  }).catch(e => {
    console.log(e)
  })
}
// 获取书籍目录接口 --章节目录详情
export const GetBookDir = ({ commit, state, dispatch }, params) => {
  return base.GetBookDir(params).then((res) => {
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
// *-------------------------------------------小说阅读接口-------------------------------------------------------------*/
