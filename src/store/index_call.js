/* eslint-disable */
import * as kurentoCall from './kurentoCall'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user: '',
    peer: ''
  },
  getters: {
    /*
     getCounter: state => {
     return state.count
   }
   */
  },
	mutations: {
		/*
		increment (state) {
			state.count++	
		},
		decrement (state) {
			if(state.count > 0) {
				state.count--
			}
		}
		*/
	},
	
	actions: {
		register (store,{user}){
			kurentoCall.register(user);  
		},
		call(store,{user,peer}){
			kurentoCall.call(user,peer);
		},
		endcall(store,{}){
			kurentoCall.stop();
		}
	}
	//	*/
})