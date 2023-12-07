import {
  getJwtToken,
  getUserId,
  getApplicationKey,
  API_URL,
  setText,
} from "../common/common.js";
import NumberCallUI from "./NumberCallUI.js";

export default class NumberCallSinchClientWrapper {
  constructor() {
    this.getLocalStream();
    this.ui = new NumberCallUI(this);
  }

  getLocalStream() {
    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        window.localStream = stream;
        window.localAudio.srcObject = stream;
        window.localAudio.autoplay = true;
      })
      .catch((err) => {
        console.error(`you got an error: ${err}`);
      });
  }

  startSinchClient(callerIdentifier) {
    this.sinchClient = Sinch.getSinchClientBuilder()
      .applicationKey(getApplicationKey())
      .userId(getUserId())
      .callerIdentifier(callerIdentifier)
      .environmentHost(API_URL)
      .build();

    this.sinchClient.addListener(this.#sinchClientListener());
    this.sinchClient.start();
  }

  #sinchClientListener() {
    return {
      onClientStarted: (sinchClient) => {
        const { callClient } = sinchClient;
        this.ui.getInput("to", "call", async (destination) => {
          setText("call", "Hangup");
          const call = await callClient.callPhoneNumber(destination);
          this.#outboundCall(call);
        });
      },

      onCredentialsRequired: (sinchClient, clientRegistration) => {
        getJwtToken()
          .then(clientRegistration.register)
          .catch((error) => {
            clientRegistration.registerFailed();
            console.error(error);
          });
      },

      onClientFailed: (sinchClient, error) => {
        console.log("Sinch - Start client failed");
        console.error(error);
      },
    };
  }

  #outboundCall(currentCall) {
    this.ui.setCurrentCall(currentCall);
    currentCall.addListener({
      // eslint-disable-next-line no-unused-vars
      onCallProgressing: (call) => {
        this.ui.onCallProgressing();
      },
      onCallEstablished: (call) => {
        this.ui.onCallEstablished(call);
      },
      onCallEnded: (call) => {
        this.ui.onCallEnded(call);
      },
    });
  }
}
