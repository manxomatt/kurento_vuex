import Vue from 'vue'
import Router from 'vue-router'
import Audiocall from '@/components/Audiocall'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Audiocall',
      component: Audiocall
    }
  ]
})