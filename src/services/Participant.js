import {Stream} from './Stream'

export class Participant{
	that = this;
	constructor(kurento, local, room, options){
		
		if (options.id === undefined) {
			this.id = "webcam";
			//
		}else{
			this.id = options.id;
		}
		this.streams = {};
		this.streamsOpts = [];
		this.room = room;
		this.kurento = kurento;
		if (options.streams) {
			console.log("stream length :" + options.streams.length)
			for (var i = 0; i < options.streams.length; i++) {
				let streamOpts = {
					id: options.streams[i].id,
					participant: this.that,
					recvVideo: (options.streams[i].recvVideo == undefined ? true : options.streams[i].recvVideo),
					recvAudio: (options.streams[i].recvAudio == undefined ? true : options.streams[i].recvAudio)
				}
				let stream = new Stream(kurento, false, room, streamOpts);
				this.addStream(stream);
				this.streamsOpts.push(streamOpts);
			}
		}
		this.that.addStream = this.addStream;
		console.log("New " + (local ? "local " : "remote ") + "participant " + this.id
        + ", streams opts: ", this.streamsOpts);
	}
	
	
	//console.log(room instanceof Room);
	

	//console.log("room name :"+room.getName());
    
    setId(newId) {
        id = newId;
    }

    addStream(stream) {
		//console.log(JSON.stringify(stream))
        console.log("ID STREAM :"+stream.getID());
		//streams[stream.getID()] = stream;
        //let streams = room.getStreams()
		this.streams[stream.getID()] = stream;
		
		//streams[stream.getID()] = stream;
		
		
        this.room.getStreams()[stream.getID()] = stream;
    }

   

    getStreams() {
        return this.streams;
    }

   dispose() {
        for (var key in this.streams) {
            this.streams[key].dispose();
        }
    }


	
    getID() {
        return this.id;
    }

    sendIceCandidate(candidate) {
        console.debug((this.local ? "Local" : "Remote"), "candidate for",this.getID(), JSON.stringify(this.candidate));
        this.kurento.sendRequest("onIceCandidate", {
            endpointName: this.getID(),
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