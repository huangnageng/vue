<!-- 介绍页 -->
<template>
  <div id="app">
    <loading v-show="loading"></loading>
    <x-header class="header-title">
      <div slot="overwrite-left" class="header-content" @click="back">
        <i class="iconfont back-icon">&#xe621;</i>
        <span class="mode-title">Home</span>
      </div>
    </x-header>
    <div class="main-box" >
    <view-box ref="viewBox"  body-padding-top="1.5rem" body-padding-bottom="0">
      <div class="content-box" style="overflow-x:hidden;">
        <mode-tpl :modeData ="setData"></mode-tpl>
      
        <!-- 广告位置 -->
        <div class="ads-box">
          <ins class="adsbygoogle"
      style="display:inline-block;width:320px;height:100px"
      data-ad-client="ca-pub-3545063517335060"
      :data-ad-slot="setData['ads']?setData['ads'][3]:''"></ins>
        </div>
        <cmm-grid :modeTitle="title" :modeList="gameDetail['mores']"></cmm-grid>
        
      </div>
       <div style="height:.24rem;"></div>
    </view-box>
   
    </div>
    
  </div>
</template>

<script>
import { XHeader, ViewBox } from 'vux'
import { mapActions, mapGetters } from 'vuex'
import CmmGrid from '../common/grid.vue'
import modeTpl from '../home/modeTpl.vue'
function getQueryObject (url) {
  url = url == null ? window.location.href : url
  var search = url.substring(url.lastIndexOf('?') + 1)
  var obj = {}
  var reg = /([^&=]+)=([^&=]*)/g
  search.replace(reg, function (rs, $1, $2) {
    var name = decodeURIComponent($1)
    var val = decodeURIComponent($2)
    val = String(val)
    obj[name] = val
  })
  return obj
}
// let data = getQueryObject().games ? getQueryObject().games.toLowerCase() : ''
// let name = data.toLowerCase()
// console.log(0)
let gid = getQueryObject().gid
var setData = []
switch (gid) {
  case '15973391':
    window.ga('create', 'UA-104413806-7', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/submarinedash/introduce/preview1.jpg',
      banner_2: 'http://www.dailyluck.net/submarinedash/introduce/preview2.jpg',
      clickUrl: 'http://www.dailyluck.net/submarinedash/game.html',
      description: 'Try to avoid enemies attack then go far far away!!',
      icon: 'http://www.dailyluck.net/submarinedash/introduce/icon.jpg',
      rate: 45,
      name: 'Submarine Dash',
      dec: 'Take your seat in your own submarine and swim through a beautiful underwater world in this all new and mega fun endless game with many cool features! Enjoy intuitive submarine controls by lifting your finger to sink down and touching the display to let it rise up again. Along your exciting adventure try to collect as many coins and fun power-ups as possible to buy powerful upgrades! Your ultimate goal is to transform your basic submarine into a high tech one! This fun and exciting game is all about speed and your hand eye skill. Get ready to explore the ocean, but be aware of enemy rockets, dangerous rocks and other obstacles!',
      ads: [1812406949, 7994671911, 8572599871, 2550773543]
    }
    break
  case 'spy chase':
    break
  case '15926239':
    window.ga('create', 'UA-104413806-6', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/heatcity/introduce/preview1.jpg',
      banner_2: 'http://www.dailyluck.net/heatcity/introduce/preview2.jpg',
      clickUrl: 'http://www.dailyluck.net/heatcity/game.html',
      description: 'Avoid other cars and roadblocks at all cost or the police wil get you!',
      icon: 'http://www.dailyluck.net/heatcity/introduce/icon.jpg',
      rate: 45,
      name: 'GTC Heat City',
      dec: 'You run across the city in a car chase with the police officers. Collect repair items from the street to fix your damaged car but avoid other cars and roadblocks at all cost or the police wil get you!',
      ads: [9032303870, 9312374046, 1919262897, 7722431521]
    }
    break
  case 'heat city':
    window.ga('create', 'UA-104413806-6', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/heatcity/introduce/preview1.jpg',
      banner_2: 'http://www.dailyluck.net/heatcity/introduce/preview2.jpg',
      clickUrl: 'http://www.dailyluck.net/heatcity/game.html',
      description: 'Avoid other cars and roadblocks at all cost or the police wil get you!',
      icon: 'http://www.dailyluck.net/heatcity/introduce/icon.jpg',
      rate: 45,
      name: 'GTC Heat City',
      dec: 'You run across the city in a car chase with the police officers. Collect repair items from the street to fix your damaged car but avoid other cars and roadblocks at all cost or the police wil get you!',
      ads: [9032303870, 9312374046, 1919262897, 7722431521]
    }
    break
  case '16151312':
    window.ga('create', 'UA-104413806-10', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/freeball/introduce/preview1.jpg',
      banner_2: 'http://www.dailyluck.net/freeball/introduce/preview2.jpg',
      clickUrl: 'http://www.dailyluck.net/freeball/game.html',
      description: "Let's ROLL THE BALL. Let's CRUSH THE PUZZLE.",
      icon: 'http://www.dailyluck.net/freeball/introduce/icon.jpg',
      rate: 45,
      name: ' Free the Ball',
      dec: 'Free the Ball is a simple yet highly addictive unblock puzzle game that will keep you hooked to the screen for a long time. In this fantastic brain teaser game your goal is to create a path for the ball to reach the goal by sliding blocks. To keep you entertained for months Free The Ball features not less than three thousand levels. Yes, we are not kidding you - three thousand levels and all of them are completely free without any purchases. Are you ready to take the challenge to solve each and every of these tricky puzzles? Play Free The Ball now and enjoy endless hours of entertainment!',
      ads: [2519925903, 9716546181, 2442413591, 3665486612]
    }
    break
  case '15857184':
    window.ga('create', 'UA-104413806-9', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/epicrun/resource/img/preview1.png',
      banner_2: 'http://www.dailyluck.net/epicrun/resource/img/preview2.png',
      clickUrl: 'http://www.dailyluck.net/epicrun/index.html',
      description: 'Time for a legendary runner: Epic Run!',
      icon: 'http://www.dailyluck.net/epicrun/resource/img/icon.png',
      rate: 45,
      name: ' Epic Run',
      dec: 'Get ready to have the most epic run! Get an exhilarating running, escape deadly traps and shifts and make your way to victory in this amazingly addictive runner! Enjoy this fast-paced skill game with amazing graphics! Be careful, it is easy to play but hard to master! If you are ready for a fun challenge in a mysterious island, Epic Run is tailored for you! Do not worry, you will get plenty of support with gifts and boosters along the way! How far can you run?',
      ads: [4659590816, 1191953243, 1930319840, 6994944263]
    }
    break
  case 'doodle jump online':
    break
  case '16279977':
    window.ga('create', 'UA-104413806-11', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/crazybirds/introduce/preview1.jpg',
      banner_2: 'http://www.dailyluck.net/crazybirds/introduce/preview2.jpg',
      clickUrl: 'http://www.dailyluck.net/crazybirds/game.html',
      description: "Use the unique powers of the Angry Birds to destroy the greedy pigs' defenses!",
      icon: 'http://www.dailyluck.net/crazybirds/introduce/icon.jpg',
      rate: 45,
      name: ' Crazy Birds',
      dec: "Help the Crazy Birds to defend themselves! The pigs want to expel the birdies from their own land and did set up fortresses already. But these birds wouldn't be known as Crazy Birds, if some walls could hold them back! Whether it's wood or stone, for those birdies it doesn't matter, as they just dive into the walls head first and crush them. And if they fail there always even crazier birds to follow. Use the different abilities of the crazy birds to defeat the army of enemy pigs. Set up the slingshot and get ready to aim, shoot and destroy all the enemy structures and angry pigs.",
      ads: [8346219229, 5205050562, 1864571359, 4758150395]
    }
    break
  case 'cookie crush 4':
    window.ga('create', 'UA-104413806-2', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/cookiecrush/resource/img/preview1.png',
      banner_2: 'http://www.dailyluck.net/cookiecrush/resource/img/preview2.png',
      clickUrl: 'http://www.dailyluck.net/cookiecrush/index.htm',
      description: 'A highly addictive match3 masterpiece!',
      icon: 'http://cdn.batmobi.net/appstore/richmedia/20170911/h6hki5bhkj27rbjbrj6z5bes_big_icon.jpg',
      rate: 45,
      name: 'Cookie Crush',
      dec: "You have to combine at least three delicious cookies to make them vanish from the field. If you manage to combine even more cookies at the same time, you will be rewarded with tons of points and of course with cool extras that can for instance wipe a whole line of sweets or make all cookies of a certain color vanish. Don't rush your moves and always keep an eye on your score as the turn limit is challenging and somtimes you need to plan a few moves ahead. Play Cookie Crush now for free and enjoy the cookies.",
      ads: [3352056599, 8828137806, 2038974296, 7515055503]
    }
    break
  case '15750452':
    window.ga('create', 'UA-104413806-2', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/cookiecrush/resource/img/preview1.png',
      banner_2: 'http://www.dailyluck.net/cookiecrush/resource/img/preview2.png',
      clickUrl: 'http://www.dailyluck.net/cookiecrush/index.htm',
      description: 'A highly addictive match3 masterpiece!',
      icon: 'http://cdn.batmobi.net/appstore/richmedia/20170911/h6hki5bhkj27rbjbrj6z5bes_big_icon.jpg',
      rate: 45,
      name: 'Cookie Crush',
      dec: "You have to combine at least three delicious cookies to make them vanish from the field. If you manage to combine even more cookies at the same time, you will be rewarded with tons of points and of course with cool extras that can for instance wipe a whole line of sweets or make all cookies of a certain color vanish. Don't rush your moves and always keep an eye on your score as the turn limit is challenging and somtimes you need to plan a few moves ahead. Play Cookie Crush now for free and enjoy the cookies.",
      ads: [3352056599, 8828137806, 2038974296, 7515055503]
    }
    break
  case '16070450':
    window.ga('create', 'UA-104413806-9', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/bozomb/introduce/preview1.jpg',
      banner_2: 'http://www.dailyluck.net/bozomb/introduce/preview2.jpg',
      clickUrl: 'http://www.dailyluck.net/bozomb/game.html',
      description: "It's time to bomb those zombies!!",
      icon: 'http://www.dailyluck.net/bozomb/introduce/icon.jpg',
      rate: 45,
      name: ' Bombs and Zombies',
      dec: 'Defend your village against zombie hordes using bombs, springs and shields! Earn money during each level and invest it wisely to buy new weapons and armor. Will you be able to stop the invasion?',
      ads: [4659590816, 1191953243, 1930319840, 6994944263]
    }
    break
  case '16992852':
    window.ga('create', 'UA-104413806-12', 'auto')
    window.ga('send', 'pageview')
    setData = {
      banner_1: 'http://www.dailyluck.net/blockracer/introduce/preview1.jpg',
      banner_2: 'http://www.dailyluck.net/blockracer/introduce/preview2.jpg',
      clickUrl: 'http://www.dailyluck.net/blockracer/game.html',
      description: 'Race through enemy vehicles and score points',
      icon: 'http://www.dailyluck.net/blockracer/introduce/icon.jpg',
      rate: 45,
      name: ' Block Racer',
      dec: 'Get into the seat of your Block Racer, rev up the engine and and try to avoid all the obstacles in this cool racing game! The retro style 8bit graphics and the fast gameplay will keep you playing for hours and hours, trying to beat your best distance. On you way you can collect coins that later can be used to unlock new cars or to continue the game after a mistake. The decision is yours, will you take a risk to collect the coins or will you play it safe to continue? Play Block Racer now for free and go as far and as fast as you can!',
      ads: [5666801133, 4506774464, 7296589339, 6338730889]
    }
    break
  case 'basketball hoops':
    break
  default:
}
// window.setData = setData
export default {
  name: 'app',
  components: {
    XHeader, ViewBox, CmmGrid, modeTpl
  },
  created () {
  },
  mounted () {
    this.setData = setData
    //  获取链接数据
    this.$nextTick(function () {
      let queNum = document.querySelectorAll('.adsbygoogle').length
      for (var i = 0; i < queNum; i++) {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    })
    this.modeRequire()
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
      gameDetail: {},
      list: [],
      setData: {}
    }
  },
  methods: {
    ...mapActions(['GetGameDir']),
    modeRequire () {
      let id = +this.paramObj.gid
      let pageLoadTime = new Date().getTime()
      return this.GetGameDir({ gid: +id }).then(res => {
        if (res.status === 200) {
          this.gameDetail = res.data
          this.uploadPageLoadTime(pageLoadTime)
          return res
        }
        return res
      })
    },
    back () {
      window.location.href = '/module/index.html'
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
      @media screen and (min-width:768px) {
        top: .6rem !important;
      }
      left: .25rem !important;
    }
    .back-icon {
      font-size: .6rem;
    }
  }
  .header-content {
    justify-content: center;
  }

</style>
