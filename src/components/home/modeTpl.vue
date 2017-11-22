<!-- 介绍页 -->
<template>
  <div id="Tpl">
    <div class="tpl-box">
      <div class="tpl-des-content">
        <img class="tpl-icon" :src="modeData.icon" alt="">
        <div class="tpl-content">
          <div class="tip-title">{{modeData.name}}</div>
             <div class="tip-start-box" >
             <img v-for="item in startCount" class="tip-star" 
              :src=" require((/\.{1}/.test(modeData.rate/10)) && (item == Math.ceil(modeData.rate/10)) ?'../../assets/start3.png': (item <= modeData.rate/10) ? '../../assets/start1.png' : '../../assets/start2.png') " 
              alt="">
             </div>
        </div>
      </div>
      <a  @click ="linkClick(modeData.clickUrl)" :data-href="modeData.clickUrl|opUrl" class="play-btn">Play Now</a>
      <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        :data-ad-slot="setData['ads']?setData['ads'][0]:''"></ins>
      </div>
      <div class="tpl-tipText">{{modeData.description}}</div>
      <div class="tpl-dimg-content">
        <img class="load-img" :src="modeData.banner_1" alt="" key='banner1'>
        <img class="load-img" :src="modeData.banner_2" alt="" key='banner2'>
      </div>
       <!-- 广告位置 -->
      <div class="ads-box">
        <ins class="adsbygoogle"
        style="display:inline-block;width:320px;height:100px"
        data-ad-client="ca-pub-3545063517335060"
        :data-ad-slot="setData['ads']?setData['ads'][1]:''"></ins>
      </div>
       <div class="play-content">
          <div class="play-title">{{decTitle}}</div>
          <div class="play-dec">
            {{setData.dec}}
          </div>
       </div>
    </div>
  </div>
</template>

<script>
export default {
  filters: {
    opUrl (e) {
      return /desc\.html/.test(e) ? e.replace('desc.html', 'game.html') : e
    }
  },
  props: {
    modeData: {
      default: {}
    }
  },
  name: 'Tpl',
  computed: {
  },
  data () {
    return {
      title: 'More Games',
      startCount: 5,
      start: 3.5,
      decTitle: 'How to play',
      setData: {}
    }
  },
  mounted () {
    let sw = document.body.clientWidth || document.documentElement.clientWidth

    for (let i = 0; i < document.querySelectorAll('img.load-img').length; i++) {
      console.log(sw)
      document.querySelectorAll('img.load-img')[i].onload = function (e) {
        let w = e.target.width || e.path[0].width
        let h = e.target.height || e.path[0].height
        document.querySelectorAll('img.load-img')[i].style.width = (h * 0.8 >= w) ? '46%' : '100%'
        if (h * 0.8 > w) {
          document.querySelector('img.load-img').style.margin = '0 4% 0 0'
        }
      }
    }
  },
  created () {
    this.setData = window.setData
  },
  methods: {
    linkClick (e) {
      this.go2Game()
      let url = /desc\.html/.test(e) ? e.replace('desc.html', 'game.html') : e
      window.location.href = url
    }
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
      border-radius: .2rem;
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
    // overflow-x: auto;
    & > img {
      width: 100%;
    }
    // & > img {
    //   width: 48%;
    //   height: 7.5rem;
    // }
    // & > img:nth-child(2n) {
    //   margin-left: 4%;
    // }
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
