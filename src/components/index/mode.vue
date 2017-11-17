<!-- 主页 -->
<template>
  <div id="app">
     <loading v-show="loading"></loading>
    <x-header class="header-title" :left-options="{showBack: false}" title="Games"></x-header>
    <div class="main-box">
    <view-box ref="viewBox" body-padding-top="1.5rem" body-padding-bottom="0">
      <div class="content-box">
        <cmm-grid :modeTitle="title" :modeList="list"></cmm-grid>
        <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        data-ad-slot="9778782402"></ins>
      </div>
        <cmm-grid :modeTitle="titleSec" :modeList="list"></cmm-grid>
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
      list: [
        {
          url: '/module/home.html?id=1',
          avatar: '../../assets/icons.png',
          name: 'Family Guy',
          count: 31821
        },
        {
          url: '/module/home.html?id=2',
          avatar: '../../assets/icons.png',
          name: 'Family Guy',
          count: 31821
        },
        {
          url: '/module/home.html?id=3',
          avatar: '../../assets/icons.png',
          name: 'Family Guy',
          count: 31821
        }
      ]
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
    ...mapActions(['GetBookInfo']),
    modeRequire () {
      let id = 101
      return this.GetBookInfo({ bookId: +id }).then(res => {
        if (res.status === 200) {
          return res
        }
        return res
      })
    }
  }
}
</script>

<style lang='less'>
  @import '../../style/common.less';
  @import '~vux/src/styles/1px.less';
  @import '~vux/src/styles/close.less';

</style>
