import EventEmitter from 'wolfy87-eventemitter'
import {Participant} from './Participant'

export class Room{
	that = this;
	participantsSpeaking = new Array();
	
	constructor(kurento, options) {
		
		this.that.name = options.room;
		this.streams = {'data':'a'}
		this.options = options;
		this.ee = new EventEmitter();
		this.kurento = kurento;
		this.participants = {};
		this.connected = false;
		this.localParticipant;
		this.subscribeToStreams = options.subscribeToStreams || true;
		this.updateSpeakerInterval = options.updateSpeakerInterval || 1500;
		this.thresholdSpeaker = options.thresholdSpeaker || -50;
		
		setInterval(this.updateMainSpeaker(), this.updateSpeakerInterval);
		this.localParticipant = new Participant(kurento, true, this.that, {id: options.user});
		this.participants[options.user] = this.localParticipant;
	
	}
    updateMainSpeaker(){
		
        if (this.participantsSpeaking.length > 0) {
            this.ee.emitEvent('update-main-speaker', [{
                participantId: this.participantsSpeaking[this.participantsSpeaking.length - 1]
            }]);
        }
		
    }
	
	getName(){
		
		return that.name
	}
    
	getLocalParticipant(){
        return this.localParticipant;
    }

    addEventListener(eventName, listener) {
        this.ee.addListener(eventName, listener);
    }

    emitEvent(eventName, eventsArray) {
        this.ee.emitEvent(eventName, eventsArray);
    }

    connect() {
		let that = this
        let joinParams = {
            user: this.options.user,
            room: this.options.room
        };
        if (this.localParticipant) {
			
            if (Object.keys(this.localParticipant.getStreams())
					.some(
					function (streamId) {
						
                    console.log("ID STREAM :"+streamId)
					//alert(that.streams);
					return that.streams[streamId].isDataChannelEnabled();
                })
				) { 
                joinParams.dataChannels = true;
            }
        }
		
		
        this.kurento.sendRequest('joinRoom', joinParams, function (error, response) {
            
			if (error) {
                console.warn('Unable to join room', error);
                that.ee.emitEvent('error-room', [{
                    error: error
                }]);
            } else {

                that.connected = true;

                let exParticipants = response.value;

                let roomEvent = {
                    participants: [],
                    streams: []
                }

                let length = exParticipants.length;
                for (let i = 0; i < length; i++) {

                    let participant = new Participant(that.kurento, false, that,
                        exParticipants[i]);

                    that.participants[participant.getID()] = participant;

                    roomEvent.participants.push(participant);

                    let streams = participant.getStreams();
                    for (var key in streams) {
                        roomEvent.streams.push(streams[key]);
                        if (that.subscribeToStreams) {
                            streams[key].subscribe();
                        }
                    }
                }

                that.ee.emitEvent('room-connected', [roomEvent]);
            }
			// */
        });
    }


    subscribe (stream) {
        stream.subscribe();
    }

    onParticipantPublished(options) {

        var participant = new Participant(this.kurento, false, this, options);

        var pid = participant.getID();
        if (!(pid in this.participants)) {
            console.info("Publisher not found in participants list by its id", pid);
        } else {
            console.log("Publisher found in participants list by its id", pid);
        }
        //replacing old participant (this one has streams)
        this.participants[pid] = participant;

        this.ee.emitEvent('participant-published', [{
            participant: participant
        }]);

        var streams = participant.getStreams();
        for (var key in streams) {
            var stream = streams[key];

            if (this.subscribeToStreams) {
                stream.subscribe();
                this.ee.emitEvent('stream-added', [{
                    stream: stream
                }]);
            }
        }
    }

    onParticipantJoined(msg) {
        var participant = new Participant(this.kurento, false, this, msg);
        var pid = participant.getID();
        if (!(pid in this.participants)) {
            console.log("New participant to participants list with id", pid);
            this.participants[pid] = participant;
        } else {
            //use existing so that we don't lose streams info
            console.info("Participant already exists in participants list with " +
                "the same id, old:", participants[pid], ", joined now:", participant);
            participant = this.participants[pid];
        }

        this.ee.emitEvent('participant-joined', [{
            participant: participant
        }]);
    }

    onParticipantLeft(msg) {
		
        var participant = this.participants[msg.name];

        if (participant !== undefined) {
            delete participants[msg.name];

            this.ee.emitEvent('participant-left', [{
                participant: participant
            }]);

            var streams = participant.getStreams();
            for (var key in streams) {
                this.ee.emitEvent('stream-removed', [{
                    stream: streams[key]
                }]);
            }

            participant.dispose();
        } else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: ");
             //   + JSON.stringify(this.participants));
        }
    };

    onParticipantEvicted(msg) {
        this.ee.emitEvent('participant-evicted', [{
            localParticipant: this.localParticipant
        }]);
    };

    onNewMessage(msg) {
        console.log("New message: " + JSON.stringify(msg));
        var room = msg.room;
        var user = msg.user;
        var message = msg.message;

        if (user !== undefined) {
            this.ee.emitEvent('newMessage', [{
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
        var participant = this.participants[msg.endpointName];
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
            this.ee.emitEvent('room-closed', [{
                room: room
            }]);
        } else {
            console.error("Room undefined in on room closed", msg);
        }
    }

    onLostConnection() {

        if (!this.connected) {
            console.error('Not connected to room, ignoring lost connection notification');
            return false;
        }

        console.log('Lost connection in room ' + this.name);
        var room = this.name;
        if (room !== undefined) {
            this.ee.emitEvent('lost-connection', [{
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
            this.ee.emitEvent('error-media', [{
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

        if (this.connected && !forced) {
            this.kurento.sendRequest('leaveRoom', function (error, response) {
                if (error) {
                    console.error(error);
                }
                jsonRpcClient.close();
            });
        } else {
            jsonRpcClient.close();
        }
        this.connected = false;
        if (this.participants) {
            for (var pid in this.participants) {
                this.participants[pid].dispose();
                delete this.participants[pid];
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
// #            delete localParticipant;
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
        return this.streams;
    }

    addParticipantSpeaking(participantId) {
        this.participantsSpeaking.push(participantId);
    }

    removeParticipantSpeaking(participantId) {
        var pos = -1;
        for (var i = 0; i < this.participantsSpeaking.length; i++) {
            if (this.participantsSpeaking[i] == participantId) {
                pos = i;
                break;
            }
        }
        if (pos != -1) {
            this.participantsSpeaking.splice(pos, 1);
        }
    }
	
}

