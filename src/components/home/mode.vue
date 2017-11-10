<!-- 介绍页 -->
<template>
  <div id="app">
  <loading v-show="loading"></loading>
    <x-header class="header-title">
      <div slot="overwrite-left" class="header-content" @click="back">
        <i class="iconfont">&#xe621;</i>
        <span class="mode-title">Game Title</span>
      </div>
    </x-header>
    <div class="main-box">
    <view-box ref="viewBox" body-padding-top="1.5rem" body-padding-bottom="0">
      <div class="content-box">
        <mode-tpl></mode-tpl>
      <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        data-ad-slot="9018369112"></ins>
      </div>
        <cmm-grid :modeTitle="title" :modeList="list"></cmm-grid>
      </div>
    </view-box>
    </div>
  </div>
</template>

<script>
import { XHeader, ViewBox } from 'vux'
import { mapActions, mapGetters } from 'vuex'
import CmmGrid from '../common/grid.vue'
import modeTpl from '../home/modeTpl.vue'
export default {
  name: 'app',
  components: {
    XHeader, ViewBox, CmmGrid, modeTpl
  },
  created () {
    this.params = this.getQueryObject()
    console.log(this.params)
  },
  mounted () {
    let queNum = document.querySelectorAll('.adsbygoogle').length
    for (var i = 0; i < queNum; i++) {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    }
  },
  computed: {
    ...mapGetters([
      'loading'
    ])
  },
  data () {
    return {
      params: {},
      title: 'More Games',
      list: [
        {
          url: '/module/home.html',
          avatar: '../../assets/n1.png',
          name: 'Family Guy',
          count: 31821
        },
        {
          url: '/module/home.html',
          avatar: '../../assets/n1.png',
          name: 'Family Guy Fames',
          count: 31821
        },
        {
          url: '/module/home.html',
          avatar: '../../assets/n1.png',
          name: 'Family Guy',
          count: 31821
        },
        {
          url: '/module/home.html',
          avatar: '../../assets/n1.png',
          name: 'Family Guy',
          count: 31821
        },
        {
          url: '/module/home.html',
          avatar: '../../assets/n1.png',
          name: 'Family Guy Fames',
          count: 31821
        },
        {
          url: '/module/home.html',
          avatar: '../../assets/n1.png',
          name: 'Family Guy',
          count: 31821
        }
      ]
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
    },
    back () {
      history.back()
    }
  }
}
</script>

<style lang='less'>
  @import '../../style/common.less';
  @import '~vux/src/styles/1px.less';
  @import '~vux/src/styles/close.less';
  .mode-title {
    color: #fff;
    font-size: .5rem;
    margin-left: .1rem;
  }
  .header-title {
    .vux-header-left {
      top: .45rem !important;
      left: .25rem !important;
    }
  }
  .header-content {
    justify-content: center;
  }

</style>
