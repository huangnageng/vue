<!-- 主页 -->
<template>
  <div id="app">
     <loading v-show="loading"></loading>
    <x-header class="header-title" :left-options="{showBack: false}" title="Games"></x-header>
    <div class="main-box">
    <view-box ref="viewBox" body-padding-top="1.5rem" body-padding-bottom="0">
      <div class="content-box">
        <cmm-grid :modeTitle="title" :modeList="list" :dataNum="false" :indexGa="true"></cmm-grid>
        <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        data-ad-slot="9778782402"></ins>
      </div>
        <cmm-grid :modeTitle="titleSec" :modeList="topList" :indexGa="true"></cmm-grid>
        <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        data-ad-slot="1022324982"></ins>
      </div>
      </div>
    </view-box>
    </div>
  </div>
</template>

<script>
import { XHeader, ViewBox } from 'vux'
import { mapActions, mapGetters } from 'vuex'
import CmmGrid from '../common/grid.vue'
window.ga('create', 'UA-104413806-15', 'auto')
window.ga('send', 'pageview')
export default {
  name: 'app',
  components: {
    XHeader, ViewBox, CmmGrid
  },
  created () {
    this.modeRequire()
  },
  computed: {
    ...mapGetters([
      'loading'
    ])
  },
  data () {
    return {
      title: 'You May Also Like',
      titleSec: 'Top Games',
      list: [],
      topList: []
    }
  },
  mounted () {
    //  获取链接数据
    console.log(this.paramObj)
    let queNum = document.querySelectorAll('.adsbygoogle').length
    for (var i = 0; i < queNum; i++) {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    }
  },
  methods: {
    ...mapActions(['GetMain']),
    modeRequire () {
      let pageLoadTime = new Date().getTime()
      return this.GetMain().then(res => {
        if (res.status === 200) {
          console.log(res)
          if (this.cookieData.length > 0) {
            if (this.cookieData.length < 3) {
              // this.list = this.cookieData.concat(res.data.likes).slice(0, 3)
              let ard = this.unique(this.cookieData.concat(res.data.likes))
              this.list = ard.slice(0, 3)
            } else {
              this.list = this.cookieData
            }
          } else {
            this.list = res.data.likes
          }
          this.topList = res.data.tops
          this.uploadIndexLoadTime(pageLoadTime)
          return res
        }
        return res
      })
    },
    unique (askArr) {
      var res = []
      for (var i = 0, len = askArr.length; i < len; i++) {
        for (var j = i + 1; j < len; j++) {
          // 如果发现相同元素
          // 则 i 自增进入下一个循环比较
          console.log(askArr[i].adsid)
          if (askArr[i].adsid === askArr[j].adsid) {
            j = ++i
          }
        }
        res.push(askArr[i])
      }
      return res
    }
  }
}
</script>

<style lang='less'>
  @import '../../style/common.less';
  @import '~vux/src/styles/1px.less';
  @import '~vux/src/styles/close.less';

</style>
