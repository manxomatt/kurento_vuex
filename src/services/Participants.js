
import store from '../store/index'

export default {
  // The install method will be called with the Vue constructor as
  // the first argument, along with possible options
   store,
   install (Vue,options) {
		Vue.prototype.$myStore = store
   },

}

export const AppParticipant = (stream) => {

    // let stream = stream;
    let videoElement;
    let thumbnailId;

    var that = this;

    AppParticipant.prototype.getStream = function() {
		let that = this;
		return that.stream;
	}

    AppParticipant.prototype.setMain = function () {
		let that = this;
        var mainVideo = document.getElementById("main-video");
        var oldVideo = mainVideo.firstChild;

        stream.playOnlyVideo("main-video", that.thumbnailId);

//        that.videoElement.className += " active-video";

        if (oldVideo !== null) {
            mainVideo.removeChild(oldVideo);
        }
    }

    AppParticipant.prototype.removeMain = function () {
        //$(that.videoElement).removeClass("active-video");
    }

    AppParticipant.prototype.remove = function () {
		let that = this;
        if (that.videoElement !== undefined) {
            if (that.videoElement.parentNode !== null) {
                that.videoElement.parentNode.removeChild(that.videoElement);
            }
        }
    }

    function playVideo() {
		//alert("playVideo");
		let that = this;

        thumbnailId = "video-" + stream.getGlobalID();

        videoElement = document.createElement('div');
        videoElement.setAttribute("id", thumbnailId);
        videoElement.className = "video";

        var buttonVideo = document.createElement('button');
        buttonVideo.className = 'action btn btn--m btn--orange btn--fab mdi md-desktop-mac';
        //FIXME this won't work, Angular can't get to bind the directive ng-click nor lx-ripple
        buttonVideo.setAttribute("ng-click", "disconnectStream();$event.stopPropagation();");
        buttonVideo.setAttribute("lx-ripple", "");
        buttonVideo.style.position = "absolute";
        buttonVideo.style.left = "75%";
        buttonVideo.style.top = "60%";
        buttonVideo.style.zIndex = "100";
        videoElement.appendChild(buttonVideo);

        var speakerSpeakingVolumen = document.createElement('div');
        speakerSpeakingVolumen.setAttribute("id","speaker" + thumbnailId);
        speakerSpeakingVolumen.className = 'btn--m btn--green btn--fab mdi md-volume-up blinking';
        speakerSpeakingVolumen.style.position = "absolute";
        speakerSpeakingVolumen.style.left = "3%";
        speakerSpeakingVolumen.style.top = "60%";
        speakerSpeakingVolumen.style.zIndex = "100";
        speakerSpeakingVolumen.style.display = "none";
        videoElement.appendChild(speakerSpeakingVolumen);

        document.getElementById("participants").appendChild(videoElement);
      //  stream.playThumbnail(thumbnailId);



    }

    playVideo();
}



export const ServiceParticipant = () => {

    let mainParticipant;
    let localParticipant;
    let mirrorParticipant;
    this.participants = {};
    let roomName = 'room_name';

    let connected = true;
    let displayingRelogin = false;
    let mainSpeaker = true;

	let that = this;



    this.isConnected = function() {
    	return connected;
    }

    this.getRoomName = function () {
        console.log("room - getRoom " + roomName);
        roomName = room.name;
        return roomName;
    };

    this.getMainParticipant = function() {
		return mainParticipant;
	}

    function updateVideoStyle() {
        var MAX_WIDTH = 14;
        var numParticipants = Object.keys(participants).length;
        var maxParticipantsWithMaxWidth = 98 / MAX_WIDTH;

        if (numParticipants > maxParticipantsWithMaxWidth) {
            /*
			$('.video').css({
                "width": (98 / numParticipants) + "%"
            });
			*/
        } else {
            /*
			$('.video').css({
                "width": MAX_WIDTH + "%"
            });
			*/
        }
    };

    function updateMainParticipant(participant) {

        if (mainParticipant) {
        	mainParticipant.removeMain();
        }
        mainParticipant = participant;
        mainParticipant.setMain();
    }

    ServiceParticipant.prototype.addLocalParticipant = function (stream) {
		let that = this;
        localParticipant = that.addParticipant(stream);
        mainParticipant = localParticipant;
        mainParticipant.setMain();
    };

    this.addLocalMirror = function (stream) {
		mirrorParticipant = that.addParticipant(stream);
	};

	this.setParticipant = function(stream_id,participant){
		//alert(this.participant);
		//that.
	}

    ServiceParticipant.prototype.addParticipant = function (stream) {

		//alert(stream.getGlobalID());
		let that = this;
        var participant = new AppParticipant(stream);
		//alert(participants);


        //that.setParticipant(stream.getGlobalID(),participant);
		participants[stream.getGlobalID()] = participant;

        updateVideoStyle();
		/*
        $(participant.videoElement).click(function (e) {
            updateMainParticipant(participant);
        });
		*/
        updateMainParticipant(participant);

        return participant;
    };

    ServiceParticipant.prototype.removeParticipantByStream = function (stream) {
		let that = this;
        that.removeParticipant(stream.getGlobalID());
    };

    this.disconnectParticipant = function (appParticipant) {
    	let that = this;
		that.removeParticipant(appParticipant.getStream().getGlobalID());
    };

    ServiceParticipant.prototype.removeParticipant = function (streamId) {
    	let participant = participants[streamId];
        delete participants[streamId];
		var bar;
		for(bar in participant){
			console.log("property is :"+bar);
		}
        participant.remove();

        if (mirrorParticipant) {
        	var otherLocal = null;
        	if (participant === localParticipant) {
        		otherLocal = mirrorParticipant;
        	}
        	if (participant === mirrorParticipant) {
        		otherLocal = localParticipant;
        	}
        	if (otherLocal) {
        		console.log("Removed local participant (or mirror) so removing the other local as well");
        		delete participants[otherLocal.getStream().getGlobalID()];
        		otherLocal.remove();
        	}
        }

        //setting main
        if (mainParticipant && mainParticipant === participant) {
        	var mainIsLocal = false;
        	if (localParticipant) {
        		if (participant !== localParticipant && participant !== mirrorParticipant) {
        			mainParticipant = localParticipant;
        			mainIsLocal = true;
        		} else {
        			localParticipant = null;
                	mirrorParticipant = null;
        		}
        	}
        	if (!mainIsLocal) {
        		var keys = Object.keys(this.participants);
        		if (keys.length > 0) {
        			mainParticipant = this.participants[keys[0]];
        		} else {
        			mainParticipant = null;
        		}
        	}
        	if (mainParticipant) {
        		mainParticipant.setMain();
        		//console.log("Main video from " + mainParticipant.getStream().getGlobalID());
        	} else
        		console.error("No media streams left to display");
        }

        updateVideoStyle();
    };

    //only called when leaving the room
    this.removeParticipants = function () {
    	connected = false;
        for (var index in participants) {
            var participant = participants[index];
            participant.remove();
        }
    };

    this.getParticipants = function () {
        return participants;
    };

    this.enableMainSpeaker = function () {
    	mainSpeaker = true;
    }

    this.disableMainSpeaker = function () {
    	mainSpeaker = false;
    }

    // Open the chat automatically when a message is received
    function autoOpenChat() {
        var selectedEffect = "slide";
        var options = {direction: "right"};
        if ($("#effect").is(':hidden')) {
            $("#content").animate({width: '80%'}, 500);
            $("#effect").toggle(selectedEffect, options, 500);
        }
    };

    this.showMessage = function (room, user, message) {
        var ul = document.getElementsByClassName("list");

        var chatDiv = document.getElementById('chatDiv');
        var messages = $("#messages");
        var updateScroll = true;

        if (messages.outerHeight() - chatDiv.scrollTop > chatDiv.offsetHeight) {
        	updateScroll = false;
        }
        console.log(localParticipant)
        var localUser = localParticipant.thumbnailId.replace("_webcam", "").replace("video-", "");
        if (room === roomName && user === localUser) { //me

            var li = document.createElement('li');
            li.className = "list-row list-row--has-primary list-row--has-separator";
            var div1 = document.createElement("div1");
            div1.className = "list-secondary-tile";
            var img = document.createElement("img");
            img.className = "list-primary-tile__img";
            img.setAttribute("src", "http://ui.lumapps.com/images/placeholder/2-square.jpg");
            var div2 = document.createElement('div');
            div2.className = "list-content-tile list-content-tile--two-lines";
            var strong = document.createElement('strong');
            strong.innerHTML = user;
            var span = document.createElement('span');
            span.innerHTML = message;
            div2.appendChild(strong);
            div2.appendChild(span);
            div1.appendChild(img);
            li.appendChild(div1);
            li.appendChild(div2);
            ul[0].appendChild(li);

//               <li class="list-row list-row--has-primary list-row--has-separator">
//                        <div class="list-secondary-tile">
//                            <img class="list-primary-tile__img" src="http://ui.lumapps.com/images/placeholder/2-square.jpg">
//                        </div>
//
//                        <div class="list-content-tile list-content-tile--two-lines">
//                            <strong>User 1</strong>
//                            <span>.............................</span>
//                        </div>
//                    </li>


        } else {//others

            var li = document.createElement('li');
            li.className = "list-row list-row--has-primary list-row--has-separator";
            var div1 = document.createElement("div1");
            div1.className = "list-primary-tile";
            var img = document.createElement("img");
            img.className = "list-primary-tile__img";
            img.setAttribute("src", "http://ui.lumapps.com/images/placeholder/1-square.jpg");
            var div2 = document.createElement('div');
            div2.className = "list-content-tile list-content-tile--two-lines";
            var strong = document.createElement('strong');
            strong.innerHTML = user;
            var span = document.createElement('span');
            span.innerHTML = message;
            div2.appendChild(strong);
            div2.appendChild(span);
            div1.appendChild(img);
            li.appendChild(div1);
            li.appendChild(div2);
            ul[0].appendChild(li);
            autoOpenChat();

//                 <li class="list-row list-row--has-primary list-row--has-separator">
//                        <div class="list-primary-tile">
//                            <img class="list-primary-tile__img" src="http://ui.lumapps.com/images/placeholder/1-square.jpg">
//                        </div>
//
//                        <div class="list-content-tile list-content-tile--two-lines">
//                            <strong>User 2</strong>
//                            <span>.............................</span>
//                        </div>
//                    </li>
        }

        if (updateScroll) {
        	chatDiv.scrollTop = messages.outerHeight();
        }
    };

    this.showError = function ($window, LxNotificationService, e) {
        if (displayingRelogin) {
            console.warn('Already displaying an alert that leads to relogin');
            return false;
          }
        displayingRelogin = true;
        that.removeParticipants();
        LxNotificationService.alert('Error!', e.error.message, 'Reconnect', function(answer) {
        	displayingRelogin = false;
            $window.location.href = '/';
        });
    };

    this.forceClose = function ($window, LxNotificationService, msg) {
        if (displayingRelogin) {
            console.warn('Already displaying an alert that leads to relogin');
            return false;
          }
        displayingRelogin = true;
        that.removeParticipants();
        LxNotificationService.alert('Warning!', msg, 'Reload', function(answer) {
        	displayingRelogin = false;
            $window.location.href = '/';
        });
    };

    this.alertMediaError = function ($window, LxNotificationService, msg, callback) {
        if (displayingRelogin) {
            console.warn('Already displaying an alert that leads to relogin');
            return false;
          }
    	LxNotificationService.confirm('Warning!', 'Server media error: ' + msg
    			+ ". Please reconnect.", { cancel:'Disagree', ok:'Agree' },
    			function(answer) {
    	            console.log("User agrees upon media error: " + answer);
    	            if (answer) {
    	            	that.removeParticipants();
    	                $window.location.href = '/';
    	            }
    	            if (typeof callback === "function") {
    	            	callback(answer);
    	            }
    			});
	};

    ServiceParticipant.prototype.streamSpeaking = (participantId) => {
    	//if (participants[participantId.participantId] != undefined)
    	//	document.getElementById("speaker" + participants[participantId.participantId].thumbnailId).style.display='';
    }

    ServiceParticipant.prototype.streamStoppedSpeaking = function(participantId) {
    	//if (participants[participantId.participantId] != undefined)
    	//	document.getElementById("speaker" + participants[participantId.participantId].thumbnailId).style.display = "none";
    }

    this.updateMainSpeaker = function(participantId) {
    	if (participants[participantId.participantId] != undefined) {
    		if (mainSpeaker)
    			updateMainParticipant(participants[participantId.participantId]);
    	}
    }
}