/* eslint-disable */

import * as KurentoRoom from '../services/KurentoRoom'
import * as ServiceParticipant from '../services/Participants'
import * as LoginPlugin from '../plugins/LoginPlugin'
import * as CallPlugin from '../plugins/CallPlugin'

import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const state = () => ({
	clientConfig:{},
	thresholdSpeaker: 0,
	updateSpeakerInterval: 0,
	roomName:''
})

const mutations = {
		SET_CLIENT_CONFIG:(state,client_config) => {
			state.clientConfig = client_config
		},
		SET_TH_SPEAKER : (state,th_speaker) => {
			state.thresholdSpeaker = th_speaker
		},
		SET_SPEAKER_INTERVAL : (state,interval) => {
			state.updateSpeakerInterval = interval
		},
		increment (state) {
		  state.updateSpeakerInterval++
		},
		setRoomName(state,room_name){
		  state.roomName = room_name
		}
	}

const getters = {
    getTHSpeaker: state => {
	  return state.thresholdSpeaker
    },
	getSpeakerInterval: state => {
	  return state.updateSpeakerInterval
	}
  }
 
const actions = {
	setTHSpeaker: ({commit,state},th_speaker) => {
		commit('SET_TH_SPEAKER',th_speaker)
		return state.thresholdSpeaker
	},
	register(store,{user,room}){
		LoginPlugin.register(user,room);
	}	
	
}

export default new Vuex.Store({
  state,
  actions,
  mutations,
  getters,
  modules: {
   
  }
})
