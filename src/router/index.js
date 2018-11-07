import Vue from 'vue'
import Router from 'vue-router'
// import Audiocall from '@/components/Audiocall'
import LoginPage from '@/components/LoginPage'
import VideoCall from '@/components/VideoCall'
import CallPage from '@/components/CallPage'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'LoginPage',
      component: LoginPage
    },
	{
      path: '/call',
      name: 'VideoCall',
      component: VideoCall
    }
  ]
})
