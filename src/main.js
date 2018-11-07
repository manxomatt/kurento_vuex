
import Vue from 'vue'
import App from './App'
import LoginPlugin from './plugins/LoginPlugin'

import router from './router'
import store from './store/index'

Vue.config.productionTip = false

Vue.use(LoginPlugin)
/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  components: { App },
  template: '<App/>'
})

