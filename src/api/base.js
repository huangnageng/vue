/** 接口 */
import { fetchApi } from './fetch'
const API = 'book'
// *-------------------------------------------小说阅读接口-------------------------------------------------------------*/
// 获取书籍信息接口
function GetBookInfo (params) {
  return fetchApi(API, 'info', params)
}
// 获取书籍目录接口 --章节目录详情
function GetBookDir (params) {
  return fetchApi(API, 'dir', params)
}
// 获取书籍章节内容接口
function GetBookDetail (params) {
  return fetchApi(API, 'chapter', params)
}
// *-------------------------------------------小说阅读接口-------------------------------------------------------------*/

export default {
  // 获取书籍信息
  GetBookInfo,
  GetBookDetail,
  GetBookDir
}
