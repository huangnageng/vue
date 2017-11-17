<template>
  <div class="grid-box">
    <div class="grid-title">{{modeTitle}}</div>
    <div class="grid-content">
      <a class="grid-a" :href="item.url" v-for="(item, index) in modeList">
        <img class="grid-icon" src="../../assets/icons.png" alt="">
        <div class="grid-dec">
          <div class="dec-title">{{item.name}}</div>
          <div class="dec-content"><i>{{parseInt(Math.random() * 70000 + 20000)}}</i><img class="sm-icon" src="../../assets/game_icon.png" alt=""></div>
          
        </div>
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Grid',
  computed: {
  },
  props: {
    modeTitle: {
      default: ''
    },
    modeList: {
      default: []
    }
  },
  data () {
    return {
      title: 'You May Also Like',
      list: [
        {
          url: '/module/home.html',
          avatar: 'https://hbimg.b0.upaiyun.com/df12ca977f12db068717b6e871502ad9f7190908c373-cwsUY7_fw658',
          name: 'Family Guy',
          count: 31821
        },
        {
          url: '/module/home.html',
          avatar: 'https://hbimg.b0.upaiyun.com/df12ca977f12db068717b6e871502ad9f7190908c373-cwsUY7_fw658',
          name: 'Family Guy Fames',
          count: 31821
        },
        {
          url: '/module/home.html',
          avatar: 'https://hbimg.b0.upaiyun.com/df12ca977f12db068717b6e871502ad9f7190908c373-cwsUY7_fw658',
          name: 'Family Guy',
          count: 31821
        }
      ]
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
