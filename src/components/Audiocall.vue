<template>
  <div id="app">
		<label class="form-label">User Name</label>
		<input class="input-text" v-model='userName' type="text">            
		<button @click.prevent='register'>Register</button>
		<label>Peer Name</label>
		<input class="form-input"  v-model='peerName' type="text">
		<button class="btn btn-primary" @click.prevent='call'>Call</button>
		<button class="btn btn-primary" @click.prevent='endcall'>End Call</button>
		
		<div id="videoBig">
			<audio id="audioOutput" autoplay controls muted></audio>
			<!-- <video id="videoOutput" autoplay width="640px" height="480px" poster="img/webrtc.png"></video> -->
		</div>
		<div id="videoSmall">
			<audio id="audioInput" autoplay controls muted></audio>
			<!-- <video id="videoInput" autoplay width="240px" height="180px" poster="img/webrtc.png"></video> -->
		</div>
		<!-- div class="counter"> {{ counter }} </div>
		<button @click="increment" class="increment"> Tambah </button>
		<button @click="decrement" class="decrement"> Kurangi </button -->
		
  </div>
</template>

<script>
import '@/assets/css/styles.css'
export default {
	data() {
        return {
            userName: '',
            roomName: '',
            peerName:''
        };
    },
	methods: {
		increment() {
			this.$store.commit('increment')
		},
		decrement() {
			this.$store.commit('decrement')
		},
		register() {
            this.$store.dispatch('register', { user: this.userName});
           
        },
        call(){
            this.$store.dispatch('call', { user: this.userName, peer: this.peerName });
        },
		endcall(){
			this.$store.dispatch('endcall',{});
		}
		
	}, 
	computed: {
		counter() {
			return this.$store.getters.getCounter
		}
	}
}
</script>

<style scoped>
#app {
  width: 70%;
  margin: 100px auto;
  background: #f1f1f1;
  padding: 15px;
}
.counter {
  width: 70%;
  padding: 50px 5px;
  margin: 20px auto;
  background: #3498db;
  color:#fff;
  font-size: 100px;
}
button {
  border: 0;
  padding: 13px 45px;
  font-weight: bold;
  margin-bottom: 20px;
}
.increment {
  background: #2c3e50;
  color: #fff;
}
.increment:hover {
  transition: .7s;
  opacity: 0.8;
  cursor: pointer;
}
.decrement {
  background: #c0392b;
  color: #fff;
}
.decrement:hover {
  transition: .7s;
  opacity: 0.9;
  cursor: pointer;
}
</style>