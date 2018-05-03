<!-- 介绍页 -->
<template>
  <div id="app">
    <!-- <yd-layout> -->
      <!-- <loading v-show="loading"></loading> -->
      <yd-navbar class="page_header" height="0.76rem" title="FILTER">
        <router-link to="#" slot="left">
            CANCEL
        </router-link>
        <router-link to="#" slot="right">
          DONE
        </router-link>
      </yd-navbar>

      <div class="container">
        <yd-flexbox class="filter_result">
            <div class="result_sum">714 results</div>
            <yd-flexbox-item>with 1 refinements applied</yd-flexbox-item>
            <div class="result_clear">Clear All</div>
        </yd-flexbox>
      {{sizeListShow}}
        
        <yd-accordion class="filter_list" accordion>
          <yd-accordion-item title="Sort View">
              <div>
                  <!-- <yd-checkbox-group>
                      <yd-checkbox val="1" shape="circle">啦啦啦</yd-checkbox>
                      <yd-checkbox val="2" shape="circle">啊啊啊</yd-checkbox>
                      <yd-checkbox val="3" shape="circle">喔喔喔</yd-checkbox>
                  </yd-checkbox-group> -->
              </div>
          </yd-accordion-item>
          <yd-accordion-item title="Sort By">
              <div>
                  <!-- <yd-cell-group>
                    <yd-cell-item type="checkbox">
                        <input slot="left" type="checkbox" value="Han MeiMei"/>                      
                        <span slot="left">多选一</span>
                    </yd-cell-item>

                    <yd-cell-item type="checkbox">
                        <span slot="left">多选二</span>
                        <input slot="right" type="checkbox" value="Li Lei"/>
                    </yd-cell-item>

                    <yd-cell-item type="checkbox">
                        <span slot="left">多选三</span>
                        <input slot="right" type="checkbox" value="Jim Green"/>
                    </yd-cell-item>
                  </yd-cell-group> -->
              </div>
          </yd-accordion-item>
          <yd-accordion-item title="Color">
              <div class="size_list">
                  <yd-checkbox-group v-model="sizeListShow">
                    <yd-checkbox val="1" shape="circle">Extra Small</yd-checkbox>
                    <yd-checkbox val="2" shape="circle">Small(S)</yd-checkbox>
                    <yd-checkbox val="3" shape="circle">Medium(M)</yd-checkbox>
                    <yd-checkbox val="4" shape="circle">Large(L)</yd-checkbox>
                    <yd-checkbox val="5" shape="circle">Extra Large</yd-checkbox>
                    <yd-checkbox val="6" shape="circle">1X</yd-checkbox>
                    <yd-checkbox val="7" shape="circle">2X</yd-checkbox>
                    <yd-checkbox val="8" shape="circle">3X</yd-checkbox>
                  </yd-checkbox-group>
              </div>
          </yd-accordion-item>
          <yd-accordion-item title="Size">
              <div class="size_list">
                  <yd-checkbox-group v-model="sizeListShow">
                    <!-- <yd-checkbox v-for="(item, index) in sizeList":key="index" val="{{index}}" shape="circle">{{index.message}}</yd-checkbox> -->
                    <yd-checkbox val="2" shape="circle">Small(S)</yd-checkbox>
                    <yd-checkbox val="3" shape="circle">Medium(M)</yd-checkbox>
                    <yd-checkbox val="4" shape="circle">Large(L)</yd-checkbox>
                    <yd-checkbox val="5" shape="circle">Extra Large</yd-checkbox>
                    <yd-checkbox val="6" shape="circle">1X</yd-checkbox>
                    <yd-checkbox val="7" shape="circle">2X</yd-checkbox>
                    <yd-checkbox val="8" shape="circle">3X</yd-checkbox>
                  </yd-checkbox-group>
              </div>
          </yd-accordion-item>
        </yd-accordion>
      </div>
      <yd-tabbar class="page_footer">
        <yd-tabbar-item title="Shop" link="#" active>
            <img slot="icon" src="../../images/home/home_tab_shop_on.png">
        </yd-tabbar-item>
        <yd-tabbar-item title="My Bag" link="#">
            <img slot="icon" src="../../images/home/home_tab_bag_off.png">
        </yd-tabbar-item>
        <yd-tabbar-item title="Account" link="#">
            <img slot="icon" src="../../images/home/home_tab_account_off.png">
        </yd-tabbar-item>
        <yd-tabbar-item title="More" link="#">
            <img slot="icon" src="../../images/home/home_tab_more_off.png">
        </yd-tabbar-item>
      </yd-tabbar>
    <!-- </yd-layout> -->
  </div>
</template>

<script type="text/babel">
  export default {
  
    data () {
      return {
        // title: 'You May Also Like',
        // titleSec: 'Top Games',
        // list: [],
        // topList: []
        sizeListShow: [],
        sizeList: [
          { message: 'Extra Small' },
          { message: 'Small(S)' },
          { message: 'Medium(M)' },
          { message: 'Large(L)' },
          { message: 'Extra Large' },
          { message: '1X' },
          { message: '2X' },
          { message: '3X' }
        ]
      }
    }
  }
</script>

<style lang='less'>
  @import '../../style/common.less';
  .filter_result{
    height:42/@html-font;
    background: #ffffff;
    font-family:@F2;
    color:@C2;
    font-size:@S6/@html-font;
    letter-spacing: @L2;
    padding:0 14/@html-font;
    border-bottom:0.5px solid #dcdcdc;
    .yd-flexbox-item{
      font-family:@F1;
      color:@C7;
    }
    .result_sum{
      margin-right:6/@html-font;
    }
    .result_clear{
      color:@C3;

    }

  }

  .filter_list{
    .yd-accordion-head{
      background:#f8f8f8;
      border:none;
      margin-bottom:1px;
      height:26/@html-font;

      &:after{
        border:none;
      }

    }
    .size_list{
      padding:14/@html-font;
      label{
        display: block;
        height:34/@html-font;
      }
      .yd-checkbox-icon{
        margin-right:9/@html-font;
      }
    }

    .yd-accordion-title span{
      font-family:@F1;
      color:@C2;
      font-size:@S8/@html-font;
    }
    .yd-accordion-head-arrow{
      &:after{
        content:none;
      }
      width:36/@html-font;
      height:100%;
      background:url('../../images/home/home_list_expand.png') no-repeat center center;
      background-size: 50% auto;
    }
    .yd-accordion-rotated{
      background:url('../../images/home/home_list_up.png') no-repeat center center;
      background-size: 50% auto;
    }
    .yd-accordion-content {
      &:after{
        border-bottom: none;
      }
    }
  }

</style>
