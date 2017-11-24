import axios from './http'
import store from '../store'
// API请求域名
let webhost = location.hostname
const URI = webhost === 'localhost' ? 'http://test.game.batmobi.net' : 'http://game.city.dailyluck.net'

// const URI = ''  测试环境http://test.book.batmobi.net  ..www.novelcamp.net
// 请求参数配置
const requireData = (postData) => {
  if (postData !== undefined) {
    let postDataStr = JSON.stringify(postData)
    postData = JSON.parse(postDataStr)
  }
  var oData = {
    data: {

    }
  }
  if (postData instanceof Object) {
    for (let x in postData) {
      oData.data[x] = postData[x]
    }
  }
  return oData.data
}
/**
 * 含上传文件图片请求方法
 * @param  {String} api    api 根地址
 * @param  {String} path   请求路径
 * @param  {String} file   文件对象，可通过input[type=file] 的change方法获得
 * @param  {Objece} params 业务参数
 * @return {Promise}       包含抓取任务的Promise
 */
const fetchFile = (api, path, { file, params }) => {
  store.commit('isLoading', { isLoading: true })
  var formData = new FormData()
  var data = requireData(params)
  formData.append('data', data)
  formData.append('file', file)
  return axios(
    {
      method: 'post',
      url: `${URI}/${api}/${path}`,
      data: formData,
      async: false,
      cache: false,
      contentType: false,
      processData: false
    }
  ).then(res => {
    store.commit('isLoading', { isLoading: false })
    return res.data
  }).catch(e => {
    store.commit('isLoading', { isLoading: false })
  })
}
/**
 * 以get方式抓取远端API的结构
 * https://developers.douban.com/wiki/?title=movie_v2
 * @param  {String} api    api 根地址
 * @param  {String} path   请求路径
 * @param  {Objece} params 参数
 * @return {Promise}       包含抓取任务的Promise
 */
const fetchGet = (api, path, params) => {
  params = requireData(params)
  // params = { data: params }

  store.commit('isLoading', { isLoading: true })
  return axios.get(`${URI}/${api}/${path}`, { params })
    .then(res => {
      store.commit('isLoading', { isLoading: false })
      console.log('请求成功')
      return res
    })
    .catch(e => {
      store.commit('isLoading', { isLoading: false })
      console.log('网络出错')
    })
}

/**
 * 以post方式抓取远端API的结构
 * https://developers.douban.com/wiki/?title=movie_v2
 * @param  {String} api    api 根地址
 * @param  {String} path   请求路径
 * @param  {Objece} params 参数
 * @return {Promise}       包含抓取任务的Promise
 */
const fetchPost = (api, path, params) => {
  params = requireData(params)
  store.commit('isLoading', { isLoading: true })
  return axios.post(`${URI}/${api}/${path}`, params)
    .then(res => {
      store.commit('isLoading', { isLoading: false })
      if (res.data.result !== undefined) {
        store.commit('setServerTime', { serverTime: res.data.result.servertime })
      }
      console.log('请求成功')
      return res.data
    })
    .catch(e => {
      store.commit('isLoading', { isLoading: false })
      console.log('网络出错')
    })
}

/**
 * 抓取远程特定类型的API
 * https://www.grandsea.com.cn/test/sfc-search/city_list
 * @type  {String} type   类型，例如：'city_list'
 * @param  {Objece} params 参数
 * @return {Promise}       包含抓取任务的Promise
 */
const fetchApi = (api, type, params) => {
  return fetchGet(api, type, params)
}

export {
  URI,
  fetchPost,
  fetchGet,
  fetchApi,
  requireData,
  fetchFile
}
