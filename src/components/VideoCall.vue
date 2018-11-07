<template>
   <div id="app">
		
		<div id="contents">
			<div id="">Channel : <b> {{$store.state.roomName}}</b></div>
			<div id="main-video">
				<!--big videos-->
			</div>
			
		</div>
		<div id="participants">

			<!--small videos-->

		</div>	
		
	</div>
</template>
<script>
import '@/assets/css/styles.css'
import store from '../store'

export default {
	data () {
    return {
      userName: '',
      roomName: '',
      peerName: ''
    }
  }
}
</script>