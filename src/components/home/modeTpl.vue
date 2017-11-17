<!-- 介绍页 -->
<template>
  <div id="Tpl">
    <div class="tpl-box">
      <div class="tpl-des-content">
        <img class="tpl-icon" src="../../assets/icons.png" alt="">
        <div class="tpl-content">
          <div class="tip-title">Cookie Gukid</div>
             <div class="tip-start-box" >
             <img v-for="item in startCount" class="tip-star" 
              :src=" require((/\.{1}/.test(start)) && (item == Math.ceil(start)) ?'../../assets/start3.png': (item <= start) ? '../../assets/start1.png' : '../../assets/start2.png') " 
              alt="">
             </div>
        </div>
      </div>
      <a href="" class="play-btn">Play Now</a>
      <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        data-ad-slot="9018369112"></ins>
      </div>
      <div class="tpl-tipText">a Hihgtly addictive match 3 mastprepic</div>
      <div class="tpl-dimg-content">
        <img src="../../assets/img1.png" alt="">
        <img src="../../assets/img2.png" alt="">
      </div>
       <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        data-ad-slot="9018369112"></ins>
      </div>
       <div class="play-content">
          <div class="play-title">{{decTitle}}</div>
          <div class="play-dec">
            wrote about her “purity pledge” that went wrong. It led to an incredibly short starter marriage. Once she realized that she and her new husband had absolutely zero sexual chemistry, she counted down the days until she could get a divorce, which happened six months into their marriage. Here are five reasons to get rid of that purity pledge and do the dirty before you say 
          </div>
       </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Tpl',
  computed: {
  },
  data () {
    return {
      title: 'More Games',
      startCount: 5,
      start: 3.5,
      decTitle: 'How to play'
    }
  },
  created () {
  },
  methods: {
  }
}
</script>

<style lang='less' scoped>
  .tpl-box {
    margin-top: .4rem;
    box-shadow: 0 0 .6rem #ccc;
    background: #fff;
    padding:.4rem .3rem .2rem .3rem;
  }
  .tpl-des-content {
    display: flex;
    .tip-title {
      font-size: .45rem;
    }
  
    .tpl-icon {
      background: #666;
      flex: 0 0 auto;
      width: 2rem;
      height: 2rem;
      margin-right: .2rem;
    }
    .tpl-content {
      display: flex;
      width: 100%;
      flex-direction: column;
      justify-content: center;
    }
    .tip-star {
      width: .37rem;
      margin: 0 .1rem;
      height: .37rem;
    }
    .tip-start-box {
      margin-top: .2rem;
      display: flex;
      flex-direction: row;

    }
  }
  .play-btn {
    font-size: .5rem;
    width: 100%;
    display: block;
    margin-top: .6rem;
    color: #fff;
    text-align: center;
      line-height: 1.6rem;
    line-height: 1.6rem;
    border-radius: .1rem;
    background: #0F9D58;
  }
  .tpl-tipText {
    padding: .2rem;
    padding-top: 0;
    margin-top: -.15rem;
    line-height: .55rem;
    font-size: .4rem;
    text-align: center;
  }
  .tpl-dimg-content {
    overflow-x: auto;
    display: flex;
    flex-wrap: nowrap;
    & > img {
      width: 48%;
      height: 7.5rem;
    }
    & > img:nth-child(2n) {
      margin-left: 4%;
    }
  }
  .play-content {
    padding: 0;
    padding-bottom: .2rem;
    .play-title {
      margin-top: -.15rem;
      line-height: .8rem;
      font-size: .5rem;
    }
    .play-dec {
      font-size: .4rem;
      color: #3f3f3f;
      line-height: .5rem;
    }
  }

</style>
