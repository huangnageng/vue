<template>
  <div class="grid-box">
    <div class="grid-title">{{modeTitle}}</div>
    <div class="grid-content">
      <a class="grid-a" @click="resetCookie($event,item)" :data-href="item.clickUrl" v-for="(item, index) in modeList">
        <img class="grid-icon" :src="item.icon" alt="">
        <div class="grid-dec">
          <div class="dec-title">{{item.name}}</div>
          <div class="dec-content" v-if="dataNum"><i>{{parseInt(Math.random() * 70000 + 20000)}}</i><img class="sm-icon" src="../../assets/game_icon.png" alt=""></div> 
        </div>
      </a>
    </div>
  </div>
</template>

<script>

var akidList = [
  '15973391',
  'spy chase',
  '15926239',
  'heat city',
  '16151312',
  '15857184',
  'doodle jump online',
  '16279977',
  '16070450',
  '15750452',
  'cookie crush',
  'cookie crush 4',
  '16992852',
  'basketball hoops'
]
export default {
  name: 'Grid',
  computed: {
  },
  props: {
    modeTitle: {
      default: ''
    },
    modeList: {
    },
    dataNum: {
      default: true
    },
    indexGa: {
      default: false
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
    unique (askArr) {
      var res = []
      for (var i = 0, len = askArr.length; i < len; i++) {
        for (var j = i + 1; j < len; j++) {
          // 如果发现相同元素
          // 则 i 自增进入下一个循环比较
          if (askArr[i].adsid === askArr[j].adsid) {
            j = ++i
          }
        }
        res.push(askArr[i])
      }
      return res
    },
    // 存放信息
    resetCookie (e, data) {
      let arr = akidList
      let id = String(data.adsid)
      let numArr = this.cookieData ? this.cookieData : []
      let url = (arr.indexOf(id) !== -1) ? '/module/home.html?gid=' + data.adsid : data.clickUrl
      if (this.indexGa) {
        this.clickGame(data.name)
      }
      let arrp = []
      // 记录小于3个
      if (numArr.length < 3) {
        numArr.unshift(data)
        arrp = this.unique(numArr)
        // this.setLocal('customer', JSON.stringify(arrp))
      } else {
        numArr.unshift(data)
        arrp = this.unique(numArr).slice(0, 3)
        // this.setLocal('customer', JSON.stringify(arrp))
      }
      // let nArr = []
      let dArr = []
      for (let n = 0; n < arrp.length; n++) {
        if (data.adsid !== arrp[n].adsid) {
          dArr.push(arrp[n])
          // console.log()
          // console.log(aArr)
          // if (leg && leg.length >= 1) {
          //   aArr.unshift(leg[0])
          // }
          // console.log(aArr)
        }
          // console.log(aArr)
          // aArr.unshift(data)
        // }
      }
      dArr.unshift(data)
      this.setLocal('customer', JSON.stringify(dArr))
      console.log(url)
      // return false
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
      -webkit-flex-wrap: wrap;
      .grid-a:nth-child(3n+2){
        margin: 0 .86rem;
      }
      .grid-a {
        width: 2.66rem;
        flex-grow: 0;
        flex-shrink: 0;
        flex-basis: auto;
        flex: 0 0 auto;
        padding: .2rem 0;
        display: inline-block;
        font-size: 0;
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
