import React, { useEffect, useRef, useState } from "react";
import { Badge, IconButton, TextField, Button } from "@mui/material";
import { io } from "socket.io-client";
import styles from "../styles/videoComponent.module.css";

import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import { useNavigate } from "react-router-dom";

const server_url = "http://localhost:8000";
let connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [showModal, setModal] = useState(true);
  const [newMessages, setNewMessages] = useState(3);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const chatScrollRef = useRef();

  // auto-scroll chat to bottom when messages change or when chat opens
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      // scroll to bottom
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, showModal]);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  const getPermission = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setVideoAvailable(!!videoPermission);

      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setAudioAvailable(!!audioPermission);

      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      if (videoAvailable || audioAvailable) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });
        window.localStream = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getPermission();
  }, []);

  const getUserMediaSuccess = (stream) => {
    try {
      window.localStream?.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;
      const connection = connections[id];

      const existingSenders = connection.getSenders();

      window.localStream.getTracks().forEach((track) => {
        const isAlreadyAdded = existingSenders.some(
          (sender) => sender.track === track
        );
        if (!isAlreadyAdded) {
          connection.addTrack(track, window.localStream);
        }
      });

      connection
        .createOffer()
        .then((desc) => connection.setLocalDescription(desc))
        .then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connection.localDescription })
          );
        })
        .catch(console.error);
    }
  };

  const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video, audio })
        .then(getUserMediaSuccess)
        .catch(console.error);
    } else {
      localVideoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) getUserMedia();
  }, [video, audio]);

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;
    const conn = connections[fromId];

    if (signal.sdp) {
      conn
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            conn
              .createAnswer()
              .then((desc) => conn.setLocalDescription(desc))
              .then(() => {
                socketRef.current.emit(
                  "signal",
                  fromId,
                  JSON.stringify({ sdp: conn.localDescription })
                );
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    }
    if (signal.ice) {
      conn
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch(console.error);
    }
  };

  const addMessage = (data, sender, socketIdSender) => {
    // push message into messages array
    setMessages((prev) => [...prev, { sender, data }]);

    // if message is from another client, increment unread counter
    if (socketIdSender !== socketIdRef.current) {
      // increment unread count; it will be cleared when user opens the chat
      setNewMessages((prev) => prev + 1);
    }
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

  socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((v) => v.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );
          const conn = connections[socketListId];

          conn.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          conn.ontrack = (event) => {
            const stream = event.streams[0];
            setVideos((videos) => {
              const existing = videos.find((v) => v.socketId === socketListId);
              if (existing) {
                return videos.map((v) =>
                  v.socketId === socketListId ? { ...v, stream } : v
                );
              }
              return [...videos, { socketId: socketListId, stream }];
            });
          };

          // ✅ FIX #1: Prevent duplicate addTrack errors
          if (window.localStream) {
            const existingSenders = conn.getSenders();

            window.localStream.getTracks().forEach((track) => {
              const isAlreadyAdded = existingSenders.some(
                (sender) => sender.track === track
              );
              if (!isAlreadyAdded) {
                conn.addTrack(track, window.localStream);
              }
            });
          } else {
            const fakeStream = new MediaStream([black(), silence()]);
            window.localStream = fakeStream;
            conn.addStream(fakeStream);
          }
        });

        // ✅ FIX #2: Also apply safety check here
        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;
            const conn = connections[id2];

            const existingSenders = conn.getSenders();
            window.localStream.getTracks().forEach((track) => {
              const isAlreadyAdded = existingSenders.some(
                (sender) => sender.track === track
              );
              if (!isAlreadyAdded) {
                conn.addTrack(track, window.localStream);
              }
            });

            conn
              .createOffer()
              .then((desc) => conn.setLocalDescription(desc))
              .then(() => {
                socketRef.current.emit(
                  "signal",
                  id2,
                  JSON.stringify({ sdp: conn.localDescription })
                );
              })
              .catch(console.error);
          }
        }
      });
    });
  };

  const getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  let routeTo=useNavigate();

  const connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  const handleVideo = () => setVideo(!video);
  const handleAudio = () => setAudio(!audio);
  let getDisplayMediaSuccess = (stream) => {
    try {
      // Stop old camera tracks
      window.localStream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    // Replace track for every peer
    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      const conn = connections[id];

      // Remove old video sender
      let videoSender = conn
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (videoSender) {
        videoSender.replaceTrack(stream.getVideoTracks()[0]);
      }

      // Replace audio sender (if screen has audio)
      let audioSender = conn
        .getSenders()
        .find((s) => s.track?.kind === "audio");
      if (audioSender && stream.getAudioTracks().length) {
        audioSender.replaceTrack(stream.getAudioTracks()[0]);
      }

      // Renegotiate offer
      conn
        .createOffer()
        .then((desc) => conn.setLocalDescription(desc))
        .then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: conn.localDescription })
          );
        })
        .catch(console.error);
    }

    // Detect when screen-share stops
    stream.getVideoTracks()[0].onended = () => {
      setScreen(false); // auto-stop screen share button
      getUserMedia(); // restore webcam
    };
  };

  let getDisplayMedia = () => {
    if (screen) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then(getDisplayMediaSuccess)
        .catch((e) => console.log(e));
    }
  };

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  let handleScreen = () => {
    setScreen(!screen);
  };

  let sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  let handleEndCall=()=>{
    try{
      let tracks=localVideoRef.current.srcObject.getTracks();
      tracks.forEach(track=>track.stop())
    }catch(e){}

    routeTo("/home")

  }

  return (
    <div>
      {askForUsername ? (
        <div>
          <h2>Enter into lobby</h2>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>
          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.meetVideoContainer}>
            {showModal ? (
              <div className={styles.chatRoom}>
                <div className={styles.chatContainer}>
                  <h1>CHAT</h1>

                    <div
                      className={styles.chattingDisplay}
                      ref={chatScrollRef}
                      aria-live="polite"
                    >
                      {messages.map((item, index) => {
                        return (
                          <div style={{ marginBottom: "12px" }} key={index}>
                            <p style={{ fontWeight: "bold", margin: 0 }}>
                              {item.sender}
                            </p>
                            <p style={{ margin: 0 }}>{item.data}</p>
                          </div>
                        );
                      })}
                    </div>

                  <div className={styles.chattingArea}>
                    <TextField
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      id="outlined-basic"
                      label="enter your chat"
                      variant="outlined"
                    />
                    <Button variant="contained" onClick={sendMessage}>
                      send
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <></>
            )}

            <div className={styles.buttonContainers}>
              <IconButton onClick={handleVideo} style={{ color: "white" }}>
                {video ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>

              <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                <CallEndIcon />
              </IconButton>

              <IconButton onClick={handleAudio} style={{ color: "white" }}>
                {audio ? <MicIcon /> : <MicOffIcon />}
              </IconButton>

              {screenAvailable && (
                <IconButton onClick={handleScreen} style={{ color: "white" }}>
                  {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                </IconButton>
              )}

              <Badge badgeContent={newMessages} max={999} color="secondary">
                <IconButton
                  onClick={() => {
                    setModal((prev) => {
                      const next = !prev;
                      if (next) setNewMessages(0); // clear unread when opening
                      return next;
                    });
                  }}
                  style={{ color: "white" }}
                >
                  <ChatIcon />
                </IconButton>
              </Badge>
            </div>

            <video
              className={styles.meetUserVideo}
              ref={localVideoRef}
              autoPlay
              muted
            ></video>

            <div className={styles.conferenceView}>
              {videos.map((video) => (
                <div key={video.socketId}>
                  <video
                    data-socket={video.socketId}
                    autoPlay
                    playsInline
                    ref={(ref) => {
                      if (ref && video.stream) ref.srcObject = video.stream;
                    }}
                  ></video>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
