import { cookie } from 'vux'
import store from './store'
import Loading from './components/common/loading.vue'
export default {
  components: {
    Loading
  },
  created () {
    var htmlEl = document.documentElement
    var momentWith = 0
    function setHtmlFontSize (designWidth, maxWidth) {
      momentWith = htmlEl.clientWidth > maxWidth ? maxWidth : htmlEl.clientWidth
      htmlEl.style.fontSize = momentWith / designWidth * 100 + 'px'
    }
    setHtmlFontSize(1080, 1080)
    window.addEventListener('resize', function () {
      setHtmlFontSize(1080, 1080)
    }, false)
  },
  data () {
    return {
    }
  },
  methods: {
    showToast (text, time) {
      const config = {
        text: text,
        type: 'text',
        width: '10.6em',
        time: time || 2500
      }
      this.$vux.toast.show(config)
    },
    showAlert (content, callback) {
      this.$vux.alert.show({
        title: '提示',
        content: content,
        onHide () {
          if (callback instanceof Function) {
            callback()
          }
        }
      })
    },
    showComfirm (text, callback) {
      this.$vux.confirm.show({
        // 组件除show外的属性
        title: text,
        onCancel () {
        },
        onConfirm () {
          if (callback instanceof Function) {
            callback()
          }
        }
      })
    },
    showLoading () {
      store.commit('isLoading', { isLoading: true })
    },
    checkPhoneReg (phone) {
      let phoneReg = /(^1\d{10}$)|(^[0-9]\d{7}$)/ // 手机号码正则表达式
      return !phoneReg.test(phone)
    },
    checkIdCardReg (idcard) {
      var IdNumberReg = /^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x))$/ // 身份证号码正则表达式
      return !IdNumberReg.test(idcard)
    },
    checkTel (tel) {
      var telReg = /^0\d{2,3}-?\d{7,8}$/ // 固定电话正则表达式
      return !telReg.test(tel)
    },
    checkEmail (email) {
      var Emailreg = /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/
      return !Emailreg.test(email)
    },
    // 回退
    goBack () {
      this.$router.go(-1)
    },
    /** 设置cookie
     * @params expires 单位为秒
     */
    setCookie (name, value, expires) {
      let expiresDate = new Date()
      expiresDate.setTime(expiresDate.getTime() + expires * 1000)
      cookie.set(name, value, {
        expires: expiresDate
      })
    },
    // 获取cookie
    getCookie (name) {
      return cookie.get(name)
    },
    // 移除cookie
    removeCookie (name) {
      cookie.remove(name)
    },
    // 获取url上参数
    getQueryObject (url) {
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
  }
}
