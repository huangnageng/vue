<template>
  <div id="app">
    <x-header class="header-title" :left-options="{showBack: false}">Games</x-header>
    <div class="main-box">
    <view-box ref="viewBox" body-padding-top="1.5rem" body-padding-bottom="0">
      <div class="content-box">
        <cmm-grid></cmm-grid>
      </div>
    </view-box>
    </div>
  </div>
</template>

<script>
import { XHeader, ViewBox } from 'vux'
import CmmGrid from './common/grid.vue'
export default {
  name: 'app',
  components: {
    XHeader, ViewBox, CmmGrid
  },
  created () {
    // this.$vux.loading.show({
    //   text: 'Loading'
    // })
  }
}
</script>

<style lang='less'>

  @import '~vux/src/styles/1px.less';
  @import '~vux/src/styles/close.less';
  @import '../style/common.less';
  .main-box {
    background: #EBEBEB;
    position: absolute;
    height:100%;
    width:100%;
    top: 0;
    z-index: 0;
    left: 0;
  }
  .content-box {
    padding: .4rem .24rem;
  }
  

</style>
