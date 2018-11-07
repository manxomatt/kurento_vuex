import kurentoUtils from 'kurento-utils'
import RpcBuilder from 'kurento-jsonrpc'
import vueRes from 'vue-resource'
import axios from 'axios'
import EventEmitter from 'wolfy87-eventemitter'
import getUserMedia from 'gumadapter'


var host = 'seruwit.com:8443'
var ee = new EventEmitter();
var connected = false;
var displayPublished = true;
var ServiceParticipant;

class Room{
	
	constructor (kurento, options){
		let _kurento = kurento;
		let _options = options;
		let name = options.room;
		let ee = new EventEmitter();
		let streams = {};
		let participants = {};
		let participantsSpeaking = [];
		let localParticipant;
		let subscribeToStreams = options.subscribeToStreams || true;
		let updateSpeakerInterval = options.updateSpeakerInterval || 1500;
		let thresholdSpeaker = options.thresholdSpeaker || -50;
		//this.connected = false;
		//console.log(options.room);
		setInterval(this.updateMainSpeaker, updateSpeakerInterval);
	}
    
	connect() {
        var joinParams = {
            user: this.options.user,
            room: this.options.room
        };
        if (this.localParticipant) {
            if (Object.keys(this.localParticipant.getStreams()).some(function (streamId) {
                    return streams[streamId].isDataChannelEnabled();
                })) {
                joinParams.dataChannels = true;
            }
        }
		
        this.kurento.sendRequest('joinRoom', joinParams, function (error, response) {
            if (error) {
                console.warn('Unable to join room', error);
                ee.emitEvent('error-room', [{
                    error: error
                }]);
            } else {

                connected = true;

                var exParticipants = response.value;

                var roomEvent = {
                    participants: [],
                    streams: []
                }

                var length = exParticipants.length;
                for (var i = 0; i < length; i++) {

                    var participant = new Participant(kurento, false, that,
                        exParticipants[i]);

                    participants[participant.getID()] = participant;

                    roomEvent.participants.push(participant);

                    var streams = participant.getStreams();
                    for (var key in streams) {
                        roomEvent.streams.push(streams[key]);
                        if (subscribeToStreams) {
                            streams[key].subscribe();
                        }
                    }
                }

                ee.emitEvent('room-connected', [roomEvent]);
            }
        });
    }
	
    updateMainSpeaker() {
       // alert(this.participantsSpeaking);
		/*
		if (this.participantsSpeaking.length > 0) {
            ee.emitEvent('update-main-speaker', [{
                participantId: this.participantsSpeaking[participantsSpeaking.length - 1]
            }]);
        }
		// */
    }

    getLocalParticipant() {
        return this.localParticipant;
    }
	
    addEventListener(eventName, listener) {
        ee.addListener(eventName, listener);
    }

    emitEvent(eventName, eventsArray) {
        ee.emitEvent(eventName, eventsArray);
    }

    subscribe(stream) {
        stream.subscribe();
    }

    onParticipantPublished(options) {

        var participant = new Participant(kurento, false, that, options);

        var pid = participant.getID();
        if (!(pid in participants)) {
            console.info("Publisher not found in participants list by its id", pid);
        } else {
            console.log("Publisher found in participants list by its id", pid);
        }
        //replacing old participant (this one has streams)
        participants[pid] = participant;

        ee.emitEvent('participant-published', [{
            participant: participant
        }]);

        var streams = participant.getStreams();
        for (var key in streams) {
            var stream = streams[key];

            if (subscribeToStreams) {
                stream.subscribe();
                ee.emitEvent('stream-added', [{
                    stream: stream
                }]);
            }
        }
    }

    onParticipantJoined(msg) {
        var participant = new Participant(kurento, false, that, msg);
        var pid = participant.getID();
        if (!(pid in participants)) {
            console.log("New participant to participants list with id", pid);
            participants[pid] = participant;
        } else {
            //use existing so that we don't lose streams info
            console.info("Participant already exists in participants list with " +
                "the same id, old:", participants[pid], ", joined now:", participant);
            participant = participants[pid];
        }

        ee.emitEvent('participant-joined', [{
            participant: participant
        }]);
    }

    onParticipantLeft(msg) {

        var participant = participants[msg.name];

        if (participant !== undefined) {
            delete participants[msg.name];

            ee.emitEvent('participant-left', [{
                participant: participant
            }]);

            var streams = participant.getStreams();
            for (var key in streams) {
                ee.emitEvent('stream-removed', [{
                    stream: streams[key]
                }]);
            }

            participant.dispose();
        } else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: "
                + JSON.stringify(participants));
        }
    };

    onParticipantEvicted(msg) {
        ee.emitEvent('participant-evicted', [{
            localParticipant: localParticipant
        }]);
    };

    onNewMessage(msg) {
        console.log("New message: " + JSON.stringify(msg));
        var room = msg.room;
        var user = msg.user;
        var message = msg.message;

        if (user !== undefined) {
            ee.emitEvent('newMessage', [{
                room: room,
                user: user,
                message: message
            }]);
        } else {
            console.error("User undefined in new message:", msg);
        }
    }

    recvIceCandidate(msg) {
        var candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex
        }
        var participant = participants[msg.endpointName];
        if (!participant) {
            console.error("Participant not found for endpoint " +
                msg.endpointName + ". Ice candidate will be ignored.",
                candidate);
            return false;
        }
        var streams = participant.getStreams();
        for (var key in streams) {
            var stream = streams[key];
            stream.getWebRtcPeer().addIceCandidate(candidate, function (error) {
                if (error) {
                    console.error("Error adding candidate for " + key
                        + " stream of endpoint " + msg.endpointName
                        + ": " + error);
                    return;
                }
            });
        }
    }

    onRoomClosed(msg) {
        console.log("Room closed: " + JSON.stringify(msg));
        var room = msg.room;
        if (room !== undefined) {
            ee.emitEvent('room-closed', [{
                room: room
            }]);
        } else {
            console.error("Room undefined in on room closed", msg);
        }
    }

    onLostConnection() {

        if (!connected) {
            console.warn('Not connected to room, ignoring lost connection notification');
            return false;
        }

        console.log('Lost connection in room ' + that.name);
        var room = that.name;
        if (room !== undefined) {
            ee.emitEvent('lost-connection', [{
                room: room
            }]);
        } else {
            console.error('Room undefined when lost connection');
        }
    }

    onMediaError(params) {
        console.error("Media error: " + JSON.stringify(params));
        var error = params.error;
        if (error) {
            ee.emitEvent('error-media', [{
                error: error
            }]);
        } else {
            console.error("Received undefined media error. Params:", params);
        }
    }

    /*
     * forced means the user was evicted, no need to send the 'leaveRoom' request
     */
	 
    leave(forced, jsonRpcClient) {
        forced = !!forced;
        console.log("Leaving room (forced=" + forced + ")");

        if (connected && !forced) {
            kurento.sendRequest('leaveRoom', function (error, response) {
                if (error) {
                    console.error(error);
                }
                jsonRpcClient.close();
            });
        } else {
            jsonRpcClient.close();
        }
        connected = false;
        if (participants) {
            for (var pid in participants) {
                participants[pid].dispose();
                delete participants[pid];
            }
        }
    }

    disconnect(stream) {
        var participant = stream.getParticipant();
        if (!participant) {
            console.error("Stream to disconnect has no participant", stream);
            return false;
        }

        delete participants[participant.getID()];
        participant.dispose();

        if (participant === localParticipant) {
            console.log("Unpublishing my media (I'm " + participant.getID() + ")");
//            delete localParticipant;
            kurento.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.info("Media unpublished correctly");
                }
            });
        } else {
            console.log("Unsubscribing from " + stream.getGlobalID());
            kurento.sendRequest('unsubscribeFromVideo', {
                    sender: stream.getGlobalID()
                },
                function (error, response) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.info("Unsubscribed correctly from " + stream.getGlobalID());
                    }
                });
        }
    }

    getStreams() {
        return streams;
    }

    addParticipantSpeaking(participantId) {
        participantsSpeaking.push(participantId);
    }

    removeParticipantSpeaking(participantId) {
        var pos = -1;
        for (var i = 0; i < participantsSpeaking.length; i++) {
            if (participantsSpeaking[i] == participantId) {
                pos = i;
                break;
            }
        }
        if (pos != -1) {
            participantsSpeaking.splice(pos, 1);
        }
    }

}
class Participant{
	constructor(kurento, local, room, options){

		var that = this;
		var id = options.id;

		var streams = {};
		var streamsOpts = [];

		if (options.streams) {
			for (var i = 0; i < options.streams.length; i++) {
				var streamOpts = {
					id: options.streams[i].id,
					participant: that,
					recvVideo: (options.streams[i].recvVideo == undefined ? true : options.streams[i].recvVideo),
					recvAudio: (options.streams[i].recvAudio == undefined ? true : options.streams[i].recvAudio)
				}
				var stream = new Stream(kurento, false, room, streamOpts);
				addStream(stream);
				streamsOpts.push(streamOpts);
			}
		}
		console.log("New " + (local ? "local " : "remote ") + "participant " + id
			+ ", streams opts: ", streamsOpts);

		that.setId = function (newId) {
			id = newId;
		}
		
		//that.addStream = addStream;

	}

    addStream(stream) {
        streams[stream.getID()] = stream;
        room.getStreams()[stream.getID()] = stream;
    }

    
    getStreams() {
        return streams;
    }

    dispose() {
        for (var key in streams) {
            streams[key].dispose();
        }
    }

    getID() {
        return id;
    }

    sendIceCandidate(candidate) {
        console.debug((local ? "Local" : "Remote"), "candidate for",
            that.getID(), JSON.stringify(candidate));
        kurento.sendRequest("onIceCandidate", {
            endpointName: that.getID(),
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                console.error("Error sending ICE candidate: "
                    + JSON.stringify(error));
            }
        });
    }
}

class Stream{
	constructor(kurento, local, room, options){
		var that = this;

		that.room = room;
		this.local = local;
		this.ee = new EventEmitter();
		this.sdpOffer;
		this.wrStream;
		this.wp;
		this.id;
		if (options.id) {
			this.id = options.id;
		} else {
			this.id = "webcam";
		}
		this.video;

		this.videoElements = [];
		this.elements = [];
		this.participant = options.participant;

		this.speechEvent;

		this.recvVideo = options.recvVideo;
		this.recvAudio = options.recvAudio;
		this.showMyRemote = false;
		this.localMirrored = false;
		this.chanId = 0;
		this.dataChannel = options.data || false;
		this.dataChannelOpened = false;
		
		this.localParticipant = new Participant(this.kurento, true, this.that, {id: options.user});
		//this.participants[options.user] = this.localParticipant;

	}
	
    
    getRecvVideo() {
        return recvVideo;
    }

    
    getRecvAudio(){
        return recvAudio;
    }

  
    subscribeToMyRemote() {
        showMyRemote = true;
    }
    
	displayMyRemote() {
        return showMyRemote;
    }

    mirrorLocalStream(wr) {
        showMyRemote = true;
        localMirrored = true;
        if (wr)
            this.wrStream = wr;
    }
    isLocalMirrored() {
        return localMirrored;
    }

    getChannelName() {
        return that.getGlobalID() + '_' + chanId++;
    }

    isDataChannelEnabled() {
        return dataChannel;
    }

    isDataChannelOpened() {
        return dataChannelOpened;
    }

    onDataChannelOpen(event) {
        console.log('Data channel is opened');
        dataChannelOpened = true;
    }

    onDataChannelClosed(event) {
        console.log('Data channel is closed');
        dataChannelOpened = false;
    }

    sendData (data) {
        if (wp === undefined) {
            throw new Error('WebRTC peer has not been created yet');
        }
        if (!dataChannelOpened) {
            throw new Error('Data channel is not opened');
        }
        console.log("Sending through data channel: " + data);
        wp.send(data);
    }

    getWrStream () {
        return this.wrStream;
    }

    getWebRtcPeer() {
        return wp;
    }

    addEventListener(eventName, listener) {
        ee.addListener(eventName, listener);
    }

    showSpinner(spinnerParentId) {
        var progress = document.createElement('div');
        progress.id = 'progress-' + that.getGlobalID();
        progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
        document.getElementById(spinnerParentId).appendChild(progress);
    }

    hideSpinner(spinnerId) {
        spinnerId = (typeof spinnerId === 'undefined') ? that.getGlobalID() : spinnerId;
        $(jq('progress-' + spinnerId)).remove();
    }

    playOnlyVideo(parentElement, thumbnailId) {
        video = document.createElement('video');

        video.id = 'native-video-' + that.getGlobalID();
        video.autoplay = true;
        video.controls = false;
        if (this.wrStream) {
            video.src = URL.createObjectURL(this.wrStream);
            $(jq(thumbnailId)).show();
            hideSpinner();
        } else
            console.log("No wrStream yet for", that.getGlobalID());

        videoElements.push({
            thumb: thumbnailId,
            video: video
        });

        if (local) {
            video.muted = true;
        }

        if (typeof parentElement === "string") {
            document.getElementById(parentElement).appendChild(video);
        } else {
            parentElement.appendChild(video);
        }

        return video;
    }

    playThumbnail(thumbnailId) {

        var container = document.createElement('div');
        container.className = "participant";
        container.id = that.getGlobalID();
        document.getElementById(thumbnailId).appendChild(container);

        elements.push(container);

        var name = document.createElement('div');
        container.appendChild(name);
        var userName = that.getGlobalID().replace('_webcam', '');
        if (userName.length >= 16) {
        	userName = userName.substring(0, 16) + "...";
        }
        name.appendChild(document.createTextNode(userName));
        name.id = "name-" + that.getGlobalID();
        name.className = "name";
        name.title = that.getGlobalID();

        showSpinner(thumbnailId);

        return that.playOnlyVideo(container, thumbnailId);
    }

    getID() {
        return id;
    }

    getParticipant() {
        return participant;
    }

    getGlobalID = function () {
        if (participant) {
            return participant.getID() + "_" + id;
        } else {
            return id + "_webcam";
        }
    }

    init() {
//        this.participant.addStream(that);

        var constraints = {
            audio: true,
            video: true
			/*
			video: {
                width: {
                    ideal: 1280
                },
                frameRate: {
                    ideal: 15
                }
            }
			// */
        };

        navigator.mediaDevices.getUserMedia(constraints).then((userStream) => {
			this.wrStream = userStream;
			ee.emitEvent('access-accepted', null);
		}).catch((error) => {
			ee.emitEvent('access-denied', null);
		})

		/*{
			//if(this.wrStream == 'undefined'){
			//	console.log("Undefined!");
			//}else{
				this.wrStream = userStream;
            //}
			ee.emitEvent('access-accepted', null);
        }, function (error) {
            console.error("Access denied", error);
            ee.emitEvent('access-denied', null);
        });
		*/
    }

    publishVideoCallback(error, sdpOfferParam, wp) {
        if (error) {
            return console.error("(publish) SDP offer error: "
                + JSON.stringify(error));
        }
        console.log("Sending SDP offer to publish as "
            + that.getGlobalID(), sdpOfferParam);
        kurento.sendRequest("publishVideo", {
            sdpOffer: sdpOfferParam,
            doLoopback: that.displayMyRemote() || false
        }, function (error, response) {
            if (error) {
                console.error("Error on publishVideo: " + JSON.stringify(error));
            } else {
                that.room.emitEvent('stream-published', [{
                    stream: that
                }])
                that.processSdpAnswer(response.sdpAnswer);
            }
        });
    }

    startVideoCallback(error, sdpOfferParam, wp) {
        if (error) {
            return console.error("(subscribe) SDP offer error: "
                + JSON.stringify(error));
        }
        console.log("Sending SDP offer to subscribe to "
            + that.getGlobalID(), sdpOfferParam);
        kurento.sendRequest("receiveVideoFrom", {
            sender: that.getGlobalID(),
            sdpOffer: sdpOfferParam
        }, function (error, response) {
            if (error) {
                console.error("Error on recvVideoFrom: " + JSON.stringify(error));
            } else {
                that.processSdpAnswer(response.sdpAnswer);
            }
        });
    }

    initWebRtcPeer(sdpOfferCallback) {
        if (this.local) {
            var options = {
                videoStream: this.wrStream,
                onicecandidate: this.participant.sendIceCandidate.bind(this.participant),
            }
            if (dataChannel) {
                options.dataChannelConfig = {
                    id: getChannelName(),
                    onopen: onDataChannelOpen,
                    onclose: onDataChannelClosed
                };
                options.dataChannels = true;
            }
            if (that.displayMyRemote()) {
                wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    this.generateOffer(sdpOfferCallback.bind(that));
                });
            } else {
                wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    this.generateOffer(sdpOfferCallback.bind(that));
                });
            }
        } else {
            var offerConstraints = {
                mandatory: {
                    OfferToReceiveVideo: recvVideo,
                    OfferToReceiveAudio: recvAudio
                }
            };
            console.log("Constraints of generate SDP offer (subscribing)",
                offerConstraints);
            var options = {
                onicecandidate: participant.sendIceCandidate.bind(participant),
                connectionConstraints: offerConstraints
            }
            wp = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                if (error) {
                    return console.error(error);
                }
                this.generateOffer(sdpOfferCallback.bind(that));
            });
        }
        console.log("Waiting for SDP offer to be generated ("
            + (this.local ? "local" : "remote") + " peer: " + that.getGlobalID() + ")");
    }

    publish() {

        // FIXME: Throw error when stream is not local

        this.initWebRtcPeer(this.publishVideoCallback);

        // FIXME: Now we have coupled connecting to a room and adding a
        // stream to this room. But in the new API, there are two steps.
        // This is the second step. For now, it do nothing.

    }

    subscribe() {

        // FIXME: In the current implementation all participants are subscribed
        // automatically to all other participants. We use this method only to
        // negotiate SDP

        initWebRtcPeer(that.startVideoCallback);
    }

    processSdpAnswer(sdpAnswer) {
        var answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer,
        });
        console.log(that.getGlobalID() + ": set peer connection with recvd SDP answer",
            sdpAnswer);
        var participantId = that.getGlobalID();
        var pc = wp.peerConnection;
        pc.setRemoteDescription(answer, function () {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!local || that.displayMyRemote()) {
                this.wrStream = pc.getRemoteStreams()[0];
                console.log("Peer remote stream", this.wrStream);
                if (this.wrStream != undefined) {
                    speechEvent = kurentoUtils.WebRtcPeer.hark(this.wrStream, {threshold: that.room.thresholdSpeaker});
                    speechEvent.on('speaking', function () {
                        that.room.addParticipantSpeaking(participantId);
                        that.room.emitEvent('stream-speaking', [{
                            participantId: participantId
                        }]);
                    });
                    speechEvent.on('stopped_speaking', function () {
                        that.room.removeParticipantSpeaking(participantId);
                        that.room.emitEvent('stream-stopped-speaking', [{
                            participantId: participantId
                        }]);
                    });
                }
                for (i = 0; i < videoElements.length; i++) {
                    var thumbnailId = videoElements[i].thumb;
                    var video = videoElements[i].video;
                    video.src = URL.createObjectURL(this.wrStream);
                    video.onplay = function () {
                        console.log(that.getGlobalID() + ': ' + 'Video playing');
                        $(jq(thumbnailId)).show();
                        hideSpinner(that.getGlobalID());
                    };
                }
                that.room.emitEvent('stream-subscribed', [{
                    stream: that
                }]);
            }
        }, function (error) {
            console.error(that.getGlobalID() + ": Error setting SDP to the peer connection: "
                + JSON.stringify(error));
        });
    }

    unpublish() {
        if (wp) {
            wp.dispose();
        } else {
            if (this.wrStream) {
                this.wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                this.wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (speechEvent) {
            speechEvent.stop();
        }

        console.log(that.getGlobalID() + ": Stream '" + id + "' unpublished");
    }

    dispose() {

        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        for (i = 0; i < elements.length; i++) {
            disposeElement(elements[i]);
        }

        for (i = 0; i < videoElements.length; i++) {
            disposeElement(videoElements[i].video);
        }

        disposeElement("progress-" + that.getGlobalID());

        if (wp) {
            wp.dispose();
        } else {
            if (this.wrStream) {
                this.wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                this.wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (speechEvent) {
            speechEvent.stop();
        }

        console.log(that.getGlobalID() + ": Stream '" + id + "' disposed");
    }
}

let KurentoRoom = (wsUri, callback) => {
	//if (!(this instanceof KurentoRoom))
    //    return new KurentoRoom(wsUri, callback);

    var that = this;

    var room;

    var userName;

    var jsonRpcClient;

    function initJsonRpcClient() {

        var config = {
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
        if (isRoomAvailable()) {
            room.emitEvent("custom-message-received", [{params: params}]);
        }
    }

    function connectCallback(error) {
        if (error) {
            callback(error);
        } else {
            callback(null, that);
        }
    }

    function isRoomAvailable() {
        if (room !== undefined && room instanceof Room) {
            return true;
            ยบ
        } else {
            console.warn('Room instance not found');
            return false;
        }
    }

    function disconnectCallback() {
        console.log('Websocket connection lost');
        if (isRoomAvailable()) {
            room.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    function reconnectingCallback() {
        console.log('Websocket connection lost (reconnecting)');
        if (isRoomAvailable()) {
            room.onLostConnection();
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    function reconnectedCallback() {
        console.log('Websocket reconnected');
    }

    function onParticipantJoined(params) {
        if (isRoomAvailable()) {
            room.onParticipantJoined(params);
        }
    }

    function onParticipantPublished(params) {
        if (isRoomAvailable()) {
            room.onParticipantPublished(params);
        }
    }

    function onParticipantLeft(params) {
        if (isRoomAvailable()) {
            room.onParticipantLeft(params);
        }
    }

    function onParticipantEvicted(params) {
        if (isRoomAvailable()) {
            room.onParticipantEvicted(params);
        }
    }

    function onNewMessage(params) {
        if (isRoomAvailable()) {
            room.onNewMessage(params);
        }
    }

    function iceCandidateEvent(params) {
        if (isRoomAvailable()) {
            room.recvIceCandidate(params);
        }
    }

    function onRoomClosed(params) {
        if (isRoomAvailable()) {
            room.onRoomClosed(params);
        }
    }

    function onMediaError(params) {
        if (isRoomAvailable()) {
            room.onMediaError(params);
        }
    }

    var rpcParams;

    this.setRpcParams = function (params) {
        rpcParams = params;
    }

    this.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = undefined;
        }
        params = params || {};

        if (rpcParams && rpcParams !== "null" && rpcParams !== "undefined") {
            for (var index in rpcParams) {
                if (rpcParams.hasOwnProperty(index)) {
                    params[index] = rpcParams[index];
                    console.log('RPC param added to request {' + index + ': ' + rpcParams[index] + '}');
                }
            }
        }
        console.log('Sending request: { method:"' + method + '", params: ' + JSON.stringify(params) + ' }');
        jsonRpcClient.send(method, params, callback);
    };

    this.close = function (forced) {
        if (isRoomAvailable()) {
            room.leave(forced, jsonRpcClient);
        }
    };

    this.disconnectParticipant = function (stream) {
        if (isRoomAvailable()) {
            room.disconnect(stream);
        }
    }

    this.Stream = function (room, options) {
        options.participant = room.getLocalParticipant();
        return new Stream(that, true, room, options);
    };

    this.Room = function (options) {
        room = new Room(that, options);
        return room;
    };

    //CHAT
    this.sendMessage = function (room, user, message) {
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

    this.sendCustomRequest = function (params, callback) {
        this.sendRequest('customRequest', params, callback);
    };

    initJsonRpcClient();
}

var updateSpeakerInterval
var clientConfig
var thresholdSpeaker

axios.get('https://'+host+'/getThresholdSpeaker').then((response) => {
  thresholdSpeaker = response.data
})

axios.get('https://'+host+ '/getClientConfig').then((response) => {
  console.log(JSON.stringify(response.data))
  clientConfig = response.data;
})
axios.get('https://'+host+'/getUpdateSpeakerInterval').then((response) => {
  updateSpeakerInterval = response.data
})
	
export const register = (userName,roomName) => {
	//alert(username+" : "+roomname)
	var wsUri = 'wss://' +host+'/room'
	ServiceParticipant = new Participant();
	
	var kurento = KurentoRoom(wsUri, function(error, kurento) {
		if (error) {
			return console.error('Error in KurentoRoom client', error);
		}
		var room
		room = kurento.Room({
			room: roomName,
			user: userName,
			updateSpeakerInterval: updateSpeakerInterval,
			thresholdSpeaker: thresholdSpeaker
		})
		
		var localStream = kurento.Stream(room, {
                audio: true,
                video: true,
                data: false
        });
		
		localStream.addEventListener("access-accepted", function() {
                room.addEventListener("room-connected", function(roomEvent) {
                    var streams = roomEvent.streams;
                   
					if (displayPublished) {
                        localStream.subscribeToMyRemote();
                    }
					//*/
                    localStream.publish();
                    ServiceRoom.setLocalStream(localStream.getWebRtcPeer());
                    for (var i = 0; i < streams.length; i++) {
                        ServiceParticipant.addParticipant(streams[i]);
                    }
					
                });

                room.addEventListener("stream-published", function(streamEvent) {
                    ServiceParticipant.addLocalParticipant(localStream);
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
                    ServiceParticipant.addParticipant(streamEvent.stream);
                });

                room.addEventListener("stream-removed", function(streamEvent) {
                    ServiceParticipant.removeParticipantByStream(streamEvent.stream);
                });

                room.addEventListener("newMessage", function(msg) {
                    ServiceParticipant.showMessage(msg.room, msg.user, msg.message);
                });

                room.addEventListener("error-room", function(error) {
                    ServiceParticipant.showError($window, LxNotificationService, error, contextpath);
                });

                room.addEventListener("error-media", function(msg) {
                    ServiceParticipant.alertMediaError($window, LxNotificationService, msg.error, contextPath, function(answer) {
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
                        ServiceParticipant.forceClose($window, LxNotificationService, 'Room ' +
                            msg.room + ' has been forcibly closed from server', contextpath);
                    }
                });

                room.addEventListener("lost-connection", function(msg) {
                    kurento.close(true);
                    ServiceParticipant.forceClose($window, LxNotificationService,
                        'Lost connection with room "' + msg.room +
                        '". Please try reloading the webpage...');
                }, null);

                room.addEventListener("stream-stopped-speaking", function(participantId) {
                    ServiceParticipant.streamStoppedSpeaking(participantId);
                });

                room.addEventListener("stream-speaking", function(participantId) {
                    ServiceParticipant.streamSpeaking(participantId);
                });

                room.addEventListener("update-main-speaker", function(participantId) {
                    ServiceParticipant.updateMainSpeaker(participantId);
                });

                room.addEventListener("custom-message-received", function(data) {
                    if (data.params.MarkerFilterState !== undefined) {
                        ServiceParticipant.changeMarkerFilterStatus(data.params.MarkerFilterState);
                    }
                });

                room.connect();
            });

		localStream.addEventListener("access-denied", function() {
			ServiceParticipant.showError($window, LxNotificationService, {
				error: {
					message: "Access not granted to camera and microphone"
				}
			});
		}, null);
		
        localStream.init();	
		// */
	})
}