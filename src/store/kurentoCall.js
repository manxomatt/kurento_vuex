
// eslint-disable-next-line
/* eslint-disable no-new */

import kurentoUtils from 'kurento-utils'

var host = 'audio.classrr.com:8443'
var ws = new WebSocket('wss://' + host + '/one2one')
var audioInput
var audioOutput
var webRtcPeer

const NOT_REGISTERED = 0
const REGISTERING = 1
const REGISTERED = 2
var registerName // eslint-disable-line no-unused-vars
var registerState // eslint-disable-line no-unused-vars
var errorMessage
var message

var constraints = {
  audio: true,
  video: false
}

let setRegisterState = (nextState) => {
  switch (nextState) {
    case NOT_REGISTERED:
      break
    case REGISTERING:
      break
    case REGISTERED:
      setCallState(NO_CALL)
      break
    default:
      return
  }
  registerState = nextState
}

const NO_CALL = 0
const PROCESSING_CALL = 1
const IN_CALL = 2
var callState = null

let setCallState = (nextState) => {
  switch (nextState) {
    case NO_CALL:
      break
    case PROCESSING_CALL:
      break
    case IN_CALL:
      break
    default:
      return
  }
  callState = nextState
}

window.onload = () => {
  // console = new Console();
  setRegisterState(NOT_REGISTERED)
  audioInput = document.getElementById('audioInput')
  audioOutput = document.getElementById('audioOutput')
}

window.onbeforeunload = () => {
  ws.close()
}

ws.onmessage = (message) => {
  var parsedMessage = JSON.parse(message.data)
  // console.info('Received message: ' + message.data)

  switch (parsedMessage.id) {
    case 'registerResponse':
      resgisterResponse(parsedMessage)
      break
    case 'callResponse':
      callResponse(parsedMessage)
      break
    case 'incomingCall':
      incomingCall(parsedMessage)
      break
    case 'startCommunication':
      startCommunication(parsedMessage)
      break
    case 'stopCommunication':
      console.info('Communication ended by remote peer')
      stop(true)
      break
    case 'iceCandidate':
      webRtcPeer.addIceCandidate(parsedMessage.candidate)
      break
    default:
      console.error('Unrecognized message', parsedMessage)
  }
}

let resgisterResponse = (message) => {
  if (message.response === 'accepted') {
    setRegisterState(REGISTERED)
  } else {
    setRegisterState(NOT_REGISTERED)
    errorMessage = message.message ? message.message : 'Unknown reason for register rejection.'
    console.log(errorMessage)
    alert('Error registering user. : ' + errorMessage)
  }
}

let callResponse = (message) => {
  if (message.response !== 'accepted') {
    // console.info('Call not accepted by peer. Closing call');
    errorMessage = message.message ? message.message : 'Unknown reason for call rejection.'
    // console.log(errorMessage);
    stop(true)
  } else {
    setCallState(IN_CALL)
    webRtcPeer.processAnswer(message.sdpAnswer)
  }
}

let startCommunication = (message) => {
  setCallState(IN_CALL)
  webRtcPeer.processAnswer(message.sdpAnswer)
}

let incomingCall = (message) => {
  // If bussy just reject without disturbing user
  if (callState !== NO_CALL) {
    var response = {
      id: 'incomingCallResponse',
      from: message.from,
      callResponse: 'reject',
      message: 'bussy'
    }
    return sendMessage(response)
  }

  setCallState(PROCESSING_CALL)
  if (confirm('User ' + message.from + ' is calling you. Do you accept the call?')) {
    showSpinner(audioInput, audioOutput)

    var options = {
      localVideo: audioInput,
      remoteVideo: audioOutput,
      onicecandidate: onIceCandidate,
      mediaConstraints: constraints
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
      if (error) {
        setCallState(NO_CALL)
      }

      this.generateOffer(function (error, offerSdp) {
        if (error) {
          setCallState(NO_CALL)
        }
        var response = {
          id: 'incomingCallResponse',
          from: message.from,
          callResponse: 'accept',
          sdpOffer: offerSdp
        }
        sendMessage(response)
      })
    })
  } else {
    response = {
      id: 'incomingCallResponse',
      from: message.from,
      callResponse: 'reject',
      message: 'user declined'
    }
    sendMessage(response)
    stop(true)
  }
}

export const register = (userName) => {
  // alert(userName);
  setRegisterState(REGISTERING)
  message = {
    id: 'register',
    name: userName
  }
  sendMessage(message)
  // */
  // document.getElementById('peer').focus();
}

export const call = (mFrom, mTo) => {
  /*
  if (document.getElementById('peer').value == '') {
   window.alert("You must specify the peer name");
   return;
  }
  */
  setCallState(PROCESSING_CALL)

  showSpinner(audioInput, audioOutput)

  var options = {
    localVideo: audioInput,
    remoteVideo: audioOutput,
    onicecandidate: onIceCandidate
  }

  webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
    if (error) {
      // console.error(error)
      setCallState(NO_CALL)
    }

    this.generateOffer(function (error, offerSdp) {
      if (error) {
        // console.error(error);
        setCallState(NO_CALL)
      }
      var message = {
        id: 'call',
        from: mFrom,
        to: mTo,
        sdpOffer: offerSdp
      }
      sendMessage(message)
    })
  })
}

export const stop = () => {
  setCallState(NO_CALL)
  if (webRtcPeer) {
    webRtcPeer.dispose()
    webRtcPeer = null

    // if (!message) {
    message = {
      id: 'stop'
    }
    sendMessage(message)
    // }
  }
  hideSpinner(audioInput, audioOutput)
}

let sendMessage = (message) => {
  var jsonMessage = JSON.stringify(message)
  console.log('Sending message: ' + jsonMessage)
  ws.send(jsonMessage)
}

let onIceCandidate = (candidate) => {
  // console.log('Local candidate' + JSON.stringify(candidate));

  var message = {
    id: 'onIceCandidate',
    candidate: candidate
  }
  sendMessage(message)
}

let showSpinner = () => {
  for (var i = 0; i < arguments.length; i++) {
    // arguments[i].poster = './img/transparent-1px.png';
    // arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
  }
}

let hideSpinner = () => {
  for (var i = 0; i < arguments.length; i++) {
    // arguments[i].src = '';
    // arguments[i].poster = './img/webrtc.png';
    // arguments[i].style.background = '';
  }
}
