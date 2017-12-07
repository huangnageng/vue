/** 接口 */
import { fetchApi } from './fetch'
const API = 'game'
// *-------------------------------------------游戏商城接口-------------------------------------------------------------*/
// 获取游戏信息接口
function GetMain (params) {
  return fetchApi(API, 'city/main', params)
}
// 获取游戏单位详情
function GetGameDir (params) {
  return fetchApi(API, 'detail', params)
}

// *-------------------------------------------游戏商城接口-------------------------------------------------------------*/

export default {
  // 获取游戏信息
  GetMain,
  GetGameDir
}
