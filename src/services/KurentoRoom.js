import kurentoUtils from 'kurento-utils'
import RpcBuilder from 'kurento-jsonrpc'
import vueRes from 'vue-resource'
import axios from 'axios'
import EventEmitter from 'wolfy87-eventemitter'
import getUserMedia from 'gumadapter'
import store from '../store/index'
import {Room} from './Room'
import {Stream} from './Stream'

/*
export default {
   store,
   install (Vue,options) {
		Vue.prototype.$myStore = store
   },

}
*/
export const KurentoRoom = (wsUri, callback) => {
	
	var that = this;
	//constructor{
		
		//this.that = this;
	let room;
	let userName;
	let jsonRpcClient;
	let rpcParams;
		
	//let wsUri = mWsUri;
	//let callback = mCallback;
		
			
		
	//}
	
	function initJsonRpcClient() {
		
        let config = {
            heartbeat: 3000,
            sendCloseMessage: false,
            ws: {
                uri: wsUri,
                useSockJS: false,
                onconnected: connectCallback,
                ondisconnect: disconnectCallback,
                onreconnecting: reconnectingCallback,
                onreconnected: reconnectedCallback
            },
            rpc: {
                requestTimeout: 15000,
                //notifications
                participantJoined: onParticipantJoined,
                participantPublished: onParticipantPublished,
                participantUnpublished: onParticipantLeft,
                participantLeft: onParticipantLeft,
                participantEvicted: onParticipantEvicted,
                sendMessage: onNewMessage,
                iceCandidate: iceCandidateEvent,
                mediaError: onMediaError,
                custonNotification: customNotification
            }
        };
		
        jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
		
		
    }
	
	function customNotification(params) {
        if (this.isRoomAvailable()) {
            //room.emitEvent("custom-message-received", [{params: params}]);
        }
    }
		
	function connectCallback(error) {
		
       
		
		if (error) {
            callback(error);
        } else {
		
            callback(null, that);
        }
		
		/*
		if (error) {
			if (typeof callback === 'function')  return callback(error);
            //callback(error);
        } else {			
			
			if (typeof callback === 'function')  return callback(null, this);
			
        }
		// */
    }
	
	function isRoomAvailable() {
		//alert(that.room);
        if (that.room !== undefined && that.room instanceof Room) {
            return true;
        } else {
            console.error('Room instance not found');
            return false;
        }
    }
	
	function disconnectCallback() {
        console.log('Websocket connection lost');
        if (isRoomAvailable()) {
            that.room.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }
	
	function reconnectingCallback() {
        console.log('Websocket connection lost (reconnecting)');
        if (isRoomAvailable()) {
            that.room.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    function reconnectedCallback() {
        console.log('Websocket reconnected');
    }

	function onParticipantJoined(params) {
		if (isRoomAvailable()) {
			that.room.onParticipantJoined(params);
		}
	}

    function onParticipantPublished(params) {
        if (isRoomAvailable()) {
            that.room.onParticipantPublished(params);
        }
    }

    function onParticipantLeft(params) {
        if (isRoomAvailable()) {
            that.room.onParticipantLeft(params);
        }
    }

    function onParticipantEvicted(params) {
        if (isRoomAvailable()) {
            that.room.onParticipantEvicted(params);
        }
    }

    function onNewMessage(params) {
        if (isRoomAvailable()) {
            that.room.onNewMessage(params);
        }
    }

    function iceCandidateEvent(params) {
        if (isRoomAvailable()) {
            that.room.recvIceCandidate(params);
        }
    }

    function onRoomClosed(params) {
        if (isRoomAvailable()) {
            that.room.onRoomClosed(params);
        }
    }

    function onMediaError(params) {
        if (isRoomAvailable()) {
            that.room.onMediaError(params);
        }
    }

    function setRpcParams(params) {
        this.rpcParams = params;
    }

    this.sendRequest = function(method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = undefined;
        }
        params = params || {};

        if (this.rpcParams && this.rpcParams !== "null" && this.rpcParams !== "undefined") {
            for (var index in this.rpcParams) {
                if (this.rpcParams.hasOwnProperty(index)) {
                    params[index] = this.rpcParams[index];
                    console.log('RPC param added to request {' + index + ': ' + this.rpcParams[index] + '}');
                }
            }
        }
        console.log('Sending request: { method:"' + method + '", params: ' + JSON.stringify(params) + ' }');
        jsonRpcClient.send(method, params, callback);
    };

    this.close = function(forced) {
        if (isRoomAvailable()) {
            that.room.leave(forced, jsonRpcClient);
        }
    };

    function disconnectParticipant(stream) {
        if (isRoomAvailable()) {
            that.room.disconnect(stream);
        }
    }

    //CHAT
    function sendMessage(room, user, message) {
        this.sendRequest('sendMessage', {
            message: message,
            userMessage: user,
            roomMessage: room
        }, function (error, response) {
            if (error) {
                console.error(error);
            }
        });
    };

    function sendCustomRequest(params, callback) {
        this.sendRequest('customRequest', params, callback);
    };
	
	initJsonRpcClient();
	this.Room =  function(options) {
			this.room = new Room(that, options);
			return this.room;
		}
		
	this.Stream = function(room, options) {
		options.participant = room.getLocalParticipant();
		return new Stream(that, true, room, options);
	}
}