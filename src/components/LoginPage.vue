
<template>
   <div id="app">
		<div class="bg-purple text-white sm:bg-green md:bg-blue md:text-yellow lg:bg-red xl:bg-orange ...">
		  Test
		</div>
		<div class="join">
			<div id="join-title">Call Line</div>
			<div class="card" id="join">
				<div class="card__content">
					<label>Username</label>
						<input type="text" id="name"  v-model='userName' required>
					
					<div class="grid">

						<div class="grid__col6">
							<label>Channel</label>
								<input type="text" id="roomName" v-model='roomName'  required>
							
						</div>
					</div>

				</div>

				<div class="card__actions">
					<div class="grid">
						
						<div class="grid__col6">
							<button @click='joinRoom'  id="joinBtn" class="btn btn--l btn--green btn--raised" lx-ripple type="submit" >Join Channel!</button>
						</div>
					</div>
					<br>
				</div>

				
			</div>
		</div>
  </div>
</template>
<script>
import store from '../store'
import {getTHSpeaker} from '../plugins/LoginPlugin'


export default {
  name: 'hello',
  data(){
	return{
	  userName: '',
      roomName: ''
	}
  },
  computed: {
    count () {
      return this.$myStore.state.updateSpeakerInterval
    }
  },
  methods: {
	joinRoom(){
		this.$store.dispatch('register', {user: this.userName, room: this.roomName})
	},
    setThSpeaker() {
      getTHSpeaker()
	  //this.$myStore.commit('SET_TH_SPEAKER',25)
    },
	doIncrement () {
      this.$store.commit('increment')
    },
	getTHStore(){
		//ServiceParticipant.getRoomName()
		//alert(this.$myStore.state.thresholdSpeaker);
	}
  },
  mounted(){
	getTHSpeaker()
	//this.$myStore.commit('SET_TH_SPEAKER',)
  }
}
// setThSpeaker()
</script>
