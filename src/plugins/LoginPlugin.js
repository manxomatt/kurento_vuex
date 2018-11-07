import store from '../store/index'
import axios from 'axios'
import {KurentoRoom} from '../services/KurentoRoom' 
import {ServiceParticipant} from '../services/Participants'
import * as ServiceRoom from '../services/serviceRoom'

var host = 'audio.classrr.com:8443'
let displayPublished = true
const serviceParticipant = new ServiceParticipant()

var mirrorLocal = false


		
export const getTHSpeaker = () => {
	axios.get('https://'+host+ '/getClientConfig').then((response) => {
	  console.log(JSON.stringify(response.data))
	  store.commit('SET_CLIENT_CONFIG',response.data)
	})
	axios.get('https://'+host+'/getThresholdSpeaker').then((response) => {
		store.commit('SET_TH_SPEAKER',response.data)
	}).catch((response)=>{})
	
	axios.get('https://'+host+'/getUpdateSpeakerInterval').then((response) => {
		store.commit('SET_SPEAKER_INTERVAL',response.data)
	})
}

export const register = (userName,roomName) => {
	const wsUri = 'wss://' +host+'/room'
	
	const kurento = KurentoRoom(wsUri, function(error, kurento) {
		if (error) {
			return console.error('Error in KurentoRoom client', error);
		}
		
		let room = kurento.Room({
			room: roomName,
			user: userName,
			updateSpeakerInterval: store.getters.getSpeakerInterval,
			thresholdSpeaker: store.getters.getTHSpeaker
		})
				
		const localStream = kurento.Stream(room, {
                audio: true,
                video: true,
                data: false
        });
		// */
		
		
		localStream.addEventListener("access-accepted", function() {
                room.addEventListener("room-connected", function(roomEvent) {
                    var streams = roomEvent.streams;
					
					if (displayPublished) {
                        localStream.subscribeToMyRemote();
                    }
					//*/
                    localStream.publish();
                    ServiceRoom.setLocalStream(localStream.getWebRtcPeer());
					
					store.commit('setRoomName',room.name)
                    for (var i = 0; i < streams.length; i++) {
                        serviceParticipant.addParticipant(streams[i]);
                    }
					
                });

                room.addEventListener("stream-published", function(streamEvent) {				
					
                    serviceParticipant.addLocalParticipant(localStream);
                    if (mirrorLocal && localStream.displayMyRemote()) {
                        var localVideo = kurento.Stream(room, {
                            video: true,
                            id: "localStream"
                        });
                        localVideo.mirrorLocalStream(localStream.getWrStream());
                        ServiceParticipant.addLocalMirror(localVideo);
                    }
                });

                room.addEventListener("stream-added", function(streamEvent) {
                    serviceParticipant.addParticipant(streamEvent.stream);
                });

                room.addEventListener("stream-removed", function(streamEvent) {
                    serviceParticipant.removeParticipantByStream(streamEvent.stream);
                });

                room.addEventListener("newMessage", function(msg) {
                    serviceParticipant.showMessage(msg.room, msg.user, msg.message);
                });

                room.addEventListener("error-room", function(error) {
                    //serviceParticipant.showError($window, LxNotificationService, error, contextpath);
                });

                room.addEventListener("error-media", function(msg) {
                    serviceParticipant.alertMediaError($window, LxNotificationService, msg.error, contextPath, function(answer) {
                        console.warn("Leave room because of error: " + answer);
                        if (answer) {
                            kurento.close(true);
                        }
                    });
                });

                room.addEventListener("room-closed", function(msg) {
                    if (msg.room !== $scope.roomName) {
                        console.error("Closed room name doesn't match this room's name",
                            msg.room, $scope.roomName);
                    } else {
                        kurento.close(true);
                     //   serviceParticipant.forceClose($window, LxNotificationService, 'Room ' +
                       //     msg.room + ' has been forcibly closed from server', contextpath);
                    }
                });

                room.addEventListener("lost-connection", function(msg) {
                    kurento.close(true);
                    /*
					serviceParticipant.forceClose($window, LxNotificationService,
                        'Lost connection with room "' + msg.room +
                        '". Please try reloading the webpage...');
						*/
                }, null);

                room.addEventListener("stream-stopped-speaking", function(participantId) {
                    serviceParticipant.streamStoppedSpeaking(participantId);
                });

                room.addEventListener("stream-speaking", function(participantId) {
                    serviceParticipant.streamSpeaking(participantId);
                });

                room.addEventListener("update-main-speaker", function(participantId) {
                    serviceParticipant.updateMainSpeaker(participantId);
                });

                room.addEventListener("custom-message-received", function(data) {
                    if (data.params.MarkerFilterState !== undefined) {
                        serviceParticipant.changeMarkerFilterStatus(data.params.MarkerFilterState);
                    }
                });

                room.connect();
            });

		localStream.addEventListener("access-denied", function () {
			/*
			serviceParticipant.showError($window, LxNotificationService, {
				error : {
					message : "Access not granted to camera and microphone"
						}
			});
			// */
		});
		
		localStream.init();	
	})
	
	location.href = '#/call';
	// */
}

export default {
  // The install method will be called with the Vue constructor as
  // the first argument, along with possible options
   store,
   install (Vue,options) {
		Vue.prototype.$store = store
   },

}
