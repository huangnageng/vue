/** 接口 */
import { fetchApi } from './fetch'
const API = 'game'
// *-------------------------------------------小说阅读接口-------------------------------------------------------------*/
// 获取书籍信息接口
function GetMain (params) {
  return fetchApi(API, 'city/main', params)
}
// 获取游戏单位详情
function GetGameDir (params) {
  return fetchApi(API, 'detail', params)
}
// 获取书籍章节内容接口
function GetBookDetail (params) {
  return fetchApi(API, 'chapter', params)
}
// *-------------------------------------------小说阅读接口-------------------------------------------------------------*/

export default {
  // 获取书籍信息
  GetMain,
  GetBookDetail,
  GetGameDir
}
