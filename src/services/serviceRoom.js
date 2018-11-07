import store from '../store/index'

export default {
  // The install method will be called with the Vue constructor as
  // the first argument, along with possible options
   store,
   install (Vue,options) {
		Vue.prototype.$myStore = store
   },

}


let kurento;
let roomName;
let userName;
let localStream;

export const getKurento = () => {
	return kurento;
}

export const getRoomName = () => {
	return roomName;
};

export const setKurento = (value) => {
	kurento = value;
};

export const setRoomName = (value) => {
	roomName = value;
};

export const getLocalStream = () => {
	return localStream;
};

export const setLocalStream =  (value) => {
	localStream = value;
};

export const getUserName = (value) => {
	return userName;
};

export const setUserName =  (value) => {
	userName = value;
};
