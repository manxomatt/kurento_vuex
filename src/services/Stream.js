import EventEmitter from 'wolfy87-eventemitter'
import kurentoUtils from 'kurento-utils'

export class Stream{
	that = this;
	constructor(kurento, local, room, options) {

		this.that.room = room;
		this.local = local
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
		this.kurento = kurento;
		
		
		
    
	}
	
	getRecvVideo() {
        return this.recvVideo;
    }

    
    getRecvAudio () {
        return this.recvAudio;
    }
   
    subscribeToMyRemote() {
        this.showMyRemote = true;
    }
    displayMyRemote() {
        return this.showMyRemote;
    }

   
    mirrorLocalStream(wr) {
        showMyRemote = true;
        localMirrored = true;
        if (wr)
            wrStream = wr;
    }
    isLocalMirrored() {
        return localMirrored;
    }

    
		
    getChannelName() {
        return that.getGlobalID() + '_' + chanId++;
    }

    
    isDataChannelEnabled() {
        return this.dataChannel;
    }

    
    isDataChannelOpened() {
        return this.dataChannelOpened;
    }

    onDataChannelOpen(event) {
        console.log('Data channel is opened');
        this.dataChannelOpened = true;
    }

    onDataChannelClosed(event) {
        console.log('Data channel is closed');
        this.dataChannelOpened = false;
    }

    sendData(data) {
        if (this.wp === undefined) {
            throw new Error('WebRTC peer has not been created yet');
        }
        if (!this.dataChannelOpened) {
            throw new Error('Data channel is not opened');
        }
        console.log("Sending through data channel: " + data);
        this.wp.send(data);
    }

    getWrStream () {
        return this.wrStream;
    }

    getWebRtcPeer() {
        return this.wp;
    }

    addEventListener (eventName, listener) {
        this.ee.addListener(eventName, listener);
    }

	showSpinner(spinnerParentId) {
        var progress = document.createElement('div');
        progress.id = 'progress-' + that.getGlobalID();
        progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
        //document.getElementById(spinnerParentId).appendChild(progress);
    }

    hideSpinner(spinnerId) {
        spinnerId = (typeof spinnerId === 'undefined') ? that.getGlobalID() : spinnerId;
        //$(jq('progress-' + spinnerId)).remove();
    }

    playOnlyVideo(parentElement, thumbnailId) {
		let that = this;
        that.video = document.createElement('audio');

		//alert(that.wrStream);
        that.video.id = 'native-video-' + that.getGlobalID();
        that.video.autoplay = true;
        that.video.controls = true;
        if (that.wrStream) {
            that.video.src = URL.createObjectURL(that.wrStream);
            //$(jq(thumbnailId)).show();
            //hideSpinner();
        } else
            console.log("No wrStream yet for", that.getGlobalID());

        that.videoElements.push({
            thumb: that.thumbnailId,
            video: that.video
        });

        if (that.local) {
            that.video.muted = true;
        }

        if (typeof parentElement === "string") {
            document.getElementById(parentElement).appendChild(that.video);
        } else {
            parentElement.appendChild(that.video);
        }

        return that.video;
    }

    playThumbnail(thumbnailId) {
		let that = this;
        var container = document.createElement('div');
        container.className = "participant";
        container.id = this.getGlobalID();
        document.getElementById(thumbnailId).appendChild(container);
		
        this.elements.push(container);

        let name = document.createElement('div');
        container.appendChild(name);
        let userName = that.getGlobalID().replace('_webcam', '');
        if (userName.length >= 16) {
        	userName = userName.substring(0, 16) + "...";
        }
        name.appendChild(document.createTextNode(userName));
        name.id = "name-" + that.getGlobalID();
        name.className = "name";
        name.title = that.getGlobalID();

        // showSpinner(thumbnailId);

        return that.playOnlyVideo(container, thumbnailId);
		// */
    }

    getID() {
        return this.id;
    }	

    getParticipant () {
        return this.participant;
    }

    getGlobalID = function(){
        if (this.participant) {
            return this.participant.getID() + "_" + this.id;
        } else {
            return this.id + "_webcam";
        }
    }
	
	
    init() {
		this.participant.addStream(this.that);

        var constraints = {
            audio: true,
            video:false
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

        //getUserMedia(constraints, function (userStream) {
        navigator.mediaDevices.getUserMedia(constraints).then((userStream) => {
			this.wrStream = userStream;
            this.ee.emitEvent('access-accepted', null);
        }).catch ((error) => {
            console.error("Access denied", error);
            this.ee.emitEvent('access-denied', null);
        });
    }

    initWebRtcPeer(sdpOfferCallback){
		
        if (this.local) {
			
            var options = {
                videoStream: this.wrStream,
                onicecandidate: this.participant.sendIceCandidate.bind(this.participant),
            }
            if (this.dataChannel) {
                options.dataChannelConfig = {
                    id: this.getChannelName(),
                    onopen: onDataChannelOpen,
                    onclose: onDataChannelClosed
                };
                options.dataChannels = true;
            }
            if (this.displayMyRemote()) {
                this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    this.generateOffer(sdpOfferCallback.bind(this.that));
                });
            } else {
                this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    this.generateOffer(sdpOfferCallback.bind(this.that));
                });
            }
        } else {
            var offerConstraints = {
                mandatory: {
                    OfferToReceiveVideo: this.recvVideo,
                    OfferToReceiveAudio: this.recvAudio
                }
            };
            console.log("Constraints of generate SDP offer (subscribing)",
                offerConstraints);
            var options = {
                onicecandidate: this.participant.sendIceCandidate.bind(this.participant),
                connectionConstraints: offerConstraints
            }
            this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                if (error) {
                    return console.error(error);
                }
                this.generateOffer(sdpOfferCallback.bind(this.that));
            });
        }
		
        console.log("Waiting for SDP offer to be generated ("+ (this.local ? "local" : "remote") + " peer: " + this.getGlobalID() + ")");
    }

    publish() {

        // FIXME: Throw error when stream is not local
		let that = this;
		
        this.initWebRtcPeer( function(error, sdpOfferParam, wp) {
        
			if (error) {
				return console.error("(publish) SDP offer error: "
					+ JSON.stringify(error));
			}
				console.log("Sending SDP offer to publish as " + that.getGlobalID(), sdpOfferParam);
				
				that.kurento.sendRequest("publishVideo", {
					sdpOffer: sdpOfferParam,
					doLoopback: that.displayMyRemote() || false
				}, 
				
				function (error, response) {
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
		)
		//(this.publishVideoCallback);

        // FIXME: Now we have coupled connecting to a room and adding a
        // stream to this room. But in the new API, there are two steps.
        // This is the second step. For now, it do nothing.

    }

    subscribe() {

        // FIXME: In the current implementation all participants are subscribed
        // automatically to all other participants. We use this method only to
        // negotiate SDP
		let that = this;
        this.initWebRtcPeer( function (error, sdpOfferParam, wp) {
			if (error) {
				return console.error("(subscribe) SDP offer error: "+ JSON.stringify(error));
			}
			console.log("Sending SDP offer to subscribe to " + that.getGlobalID(), sdpOfferParam);
			that.kurento.sendRequest("receiveVideoFrom", {
				sender: that.getGlobalID(),
				sdpOffer: sdpOfferParam
			}, function (error, response) {
				if (error) {
					console.error("Error on recvVideoFrom: " + JSON.stringify(error));
				} else {
					that.processSdpAnswer(response.sdpAnswer);
				}
			});
		});
		//this.that.startVideoCallback);
    }

    processSdpAnswer(sdpAnswer) {
		let that = this;
		
        var answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer,
        });
        console.log(that.getGlobalID() + ": set peer connection with recvd SDP answer", sdpAnswer);
        var participantId = that.getGlobalID();
        var pc = that.wp.peerConnection;
        pc.setRemoteDescription(answer, function () {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!that.local || that.displayMyRemote()) {
                that.wrStream = pc.getRemoteStreams()[0];
                console.log("Peer remote stream", that.wrStream);
                if (that.wrStream != undefined) {
                    that.speechEvent = kurentoUtils.WebRtcPeer.hark(that.wrStream, {threshold: that.room.thresholdSpeaker});
                    that.speechEvent.on('speaking', function () {
                        that.room.addParticipantSpeaking(participantId);
                        that.room.emitEvent('stream-speaking', [{
                            participantId: participantId
                        }]);
                    });
                    that.speechEvent.on('stopped_speaking', function () {
                        that.room.removeParticipantSpeaking(participantId);
                        that.room.emitEvent('stream-stopped-speaking', [{
                            participantId: participantId
                        }]);
                    });
                }
                for (let i = 0; i < that.videoElements.length; i++) {
                    var thumbnailId = that.videoElements[i].thumb;
                    var video = that.videoElements[i].video;
                    video.src = URL.createObjectURL(that.wrStream);
                    video.onplay = function () {
                        console.log(that.getGlobalID() + ': ' + 'Video playing');
                        //$(jq(thumbnailId)).show();
                        //hideSpinner(that.getGlobalID());
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
            if (wrStream) {
                wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                wrStream.getVideoTracks().forEach(function (track) {
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
		let that = this;
        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        for (let i = 0; i < this.elements.length; i++) {
            disposeElement(this.elements[i]);
        }

        for (let i = 0; i < this.videoElements.length; i++) {
            disposeElement(this.videoElements[i].video);
        }

        disposeElement("progress-" + that.getGlobalID());

        if (that.wp) {
            that.wp.dispose();
        } else {
            if (that.wrStream) {
                that.wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                that.wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (that.speechEvent) {
            that.speechEvent.stop();
        }

        console.log(that.getGlobalID() + ": Stream '" + that.id + "' disposed");
    }
}