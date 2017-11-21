<template>
  <div class="grid-box">
    <div class="grid-title">{{modeTitle}}</div>
    <div class="grid-content">
      <a class="grid-a" @click="resetCookie($event,item)" :data-href="item.clickUrl" v-for="(item, index) in modeList">
        <img class="grid-icon" :src="item.icon" alt="">
        <div class="grid-dec">
          <div class="dec-title">{{item.name}}</div>
          <div class="dec-content"><i>{{parseInt(Math.random() * 70000 + 20000)}}</i><img class="sm-icon" src="../../assets/game_icon.png" alt=""></div> 
        </div>
      </a>
    </div>
  </div>
</template>

<script>
var akidList = [
  'submarine dash',
  'spy chase',
  'gtc heat city',
  'heat city',
  'free the ball',
  'epic run',
  'doodle jump online',
  'crazy birds',
  'bombs and zombies',
  'cookie crush 2',
  'cookie crush 4',
  'block racer',
  'basketball hoops'
]
export default {
  name: 'Grid',
  filters: {
    double (e, id, name) {
      // let hostname = location.hostname
      // let patt = new RegExp(hostname + '?')
      // let arr = akidList
      // return arr.indexOf(name.toLowerCase()) !== -1 ? '/module/home.html?gid=' + id + '&games=' + name : e
    }
  },
  computed: {
  },
  props: {
    modeTitle: {
      default: ''
    },
    modeList: {
    }
  },
  data () {
    return {
      akidList: [
        {
          id: 15796262,
          url: ''
        },
        {
          id: 15857184,
          url: ''
        },
        {
          id: 16279977,
          url: ''
        },
        {
          id: 15796262,
          url: ''
        },
        {
          id: 15857184,
          url: ''
        },
        {
          id: 16279977,
          url: ''
        },
        {
          id: 16070450,
          url: ''
        },
        {
          id: 15926239,
          url: ''
        }
      ]
    }
  },
  methods: {
    // 存放信息
    resetCookie (e, data) {
      let arr = akidList
      let name = data.name.toLowerCase()
      let numArr = this.getCookie('customer') ? JSON.parse(this.getCookie('customer')) : []
      let url = arr.indexOf(name) !== -1 ? '/module/home.html?gid=' + data.adsid + '&games=' + name : data.clickUrl
      console.log(numArr)
      if (numArr.length < 3) {
        let dataArr = numArr.reverse()
        if (dataArr.length === 0) {
          let arrOne = dataArr.concat(data)
          let arrTwo = arrOne.reverse()
          this.setCookie('customer', JSON.stringify(arrTwo))
          console.log(JSON.parse(this.getCookie('customer')))
        }
        for (let i = 0; i < dataArr.length; i++) {
          console.log(dataArr[i].adsid)
          if (dataArr[i].adsid !== data.adsid) {
            console.log(dataArr[i])
            let arrOne = dataArr.concat(data)
            let arrTwo = arrOne.reverse()
            this.setCookie('customer', JSON.stringify(arrTwo))
            console.log(JSON.parse(this.getCookie('customer')))
          }
        }
      } else {
        let dataArr = numArr.reverse()
        for (let i = 0; i < dataArr.length; i++) {
          let arrOne = dataArr.concat(data)
          let arrTwo = arrOne.reverse()
          arrTwo.pop()
          this.setCookie('customer', JSON.stringify(arrTwo))
        }
        console.log(JSON.parse(this.getCookie('customer')))
      }
      // return false
      console.log(url)
      window.location.href = url
    }
  }
}
</script>
<style scoped lang='less'>
  .grid-box{
    margin-top: .4rem;
    box-shadow: 0 0 .6rem #ccc;
    background: #fff;
    padding:.4rem .3rem .2rem .3rem;
    .grid-title {
      font-weight: 500;
      font-size: .5rem;
      margin-bottom: .2rem;
    }
    .grid-content {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      .grid-a:nth-child(3n+2){
        margin: 0 .86rem;
      }
      .grid-a {
        width: 2.66rem;
        flex: 0 0 auto;
        padding: .2rem 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        .grid-icon {
          background: #999;
          border-radius: .2rem;
          width: 2.6rem;
          height: 2.6rem;
        }
        .grid-dec {
          width:100%;
          display: flex;
          flex-direction: column;
          flex: 0 0 auto;
          margin-top: .3rem;
        }
        
        .dec-title { 
          flex: 0 0 auto;
          white-space: nowrap;
          width:100%;
          text-align: center;
          font-size: .4rem;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dec-content {
          text-align: center;
          color: #707070;
          font-size: .32rem;
          margin-top: .08rem;
          & > img {
             width: .44rem;
             height: .4rem;
             margin-left: .1rem;
             position: relative;
          }
        }

      }

    }
  }
</style>
