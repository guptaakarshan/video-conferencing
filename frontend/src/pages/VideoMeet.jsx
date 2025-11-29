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
import server from "../environment";

const server_url = server;

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const chatScrollRef = useRef(null);

  const connectionsRef = useRef({});
  const connections = connectionsRef.current;

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [showModal, setModal] = useState(true);
  const [newMessages, setNewMessages] = useState(0);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  const navigate = useNavigate();

  // AUTO SCROLL CHAT

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, showModal]);

  // FIXED: SINGLE PERMISSION CHECK

  const getPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setVideoAvailable(true);
      setAudioAvailable(true);

      window.localStream = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Permission error:", err);
    }

    // screen share availability
    setScreenAvailable(
      typeof navigator.mediaDevices.getDisplayMedia === "function"
    );
  };

  useEffect(() => {
    getPermission();
  }, []);

  // 🎥 Handle getUserMedia Stream

  const getUserMediaSuccess = (stream) => {
    try {
      window.localStream?.getTracks().forEach((t) => t.stop());
    } catch {}

    window.localStream = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    // Update all peer tracks
    for (let id in connections) {
      const conn = connections[id];

      window.localStream.getTracks().forEach((track) => {
        const sender = conn
          .getSenders()
          .find((s) => s.track && s.track.kind === track.kind);

        if (sender) sender.replaceTrack(track);
        else conn.addTrack(track, window.localStream);
      });

      conn
        .createOffer()
        .then((desc) => conn.setLocalDescription(desc))
        .then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: conn.localDescription })
          );
        });
    }
  };

  const getUserMedia = () => {
    if (video || audio) {
      navigator.mediaDevices
        .getUserMedia({ video, audio })
        .then(getUserMediaSuccess)
        .catch(console.error);
    } else {
      // stop camera entirely
      window.localStream?.getTracks().forEach((t) => t.stop());
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  //SIGNAL HANDLING FROM SERVER

  const gotMessageFromServer = (fromId, message) => {
    if (fromId === socketIdRef.current) return;

    let signal = JSON.parse(message);
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
              });
          }
        });
    }

    if (signal.ice) {
      conn
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch(console.error);
    }
  };

  // FIXED: CHAT MESSAGES

  const addMessage = (data, sender, socketSender) => {
    setMessages((prev) => [...prev, { sender, data }]);

    if (!showModal && socketSender !== socketIdRef.current) {
      setNewMessages((p) => p + 1); // only when chat closed
    }
  };

  // SOCKET.IO CONNECTION

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", window.location.href);
    });

    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("chat-message", addMessage);

    socketRef.current.on("user-left", (id) => {
      setVideos((v) => v.filter((x) => x.socketId !== id));
      delete connections[id];
    });

    socketRef.current.on("user-joined", (id, clients) => {
      clients.forEach((clientId) => {
        if (clientId === socketIdRef.current) return;

        connections[clientId] = new RTCPeerConnection(peerConfigConnections);
        const conn = connections[clientId];

        conn.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit(
              "signal",
              clientId,
              JSON.stringify({ ice: event.candidate })
            );
          }
        };

        conn.ontrack = (event) => {
          const incomingStream = event.streams[0];
          setVideos((prev) => {
            const exists = prev.find((v) => v.socketId === clientId);
            if (exists) {
              return prev.map((p) =>
                p.socketId === clientId ? { ...p, stream: incomingStream } : p
              );
            }
            return [...prev, { socketId: clientId, stream: incomingStream }];
          });
        };

        // Attach tracks
        if (window.localStream) {
          window.localStream.getTracks().forEach((track) => {
            conn.addTrack(track, window.localStream);
          });
        }
      });

      // make offer to all peers
      if (id === socketIdRef.current) {
        for (let pid in connections) {
          if (pid === socketIdRef.current) continue;

          let peer = connections[pid];
          peer
            .createOffer()
            .then((desc) => peer.setLocalDescription(desc))
            .then(() => {
              socketRef.current.emit(
                "signal",
                pid,
                JSON.stringify({ sdp: peer.localDescription })
              );
            });
        }
      }
    });
  };

  const connect = () => {
    setAskForUsername(false);

    
    setVideo(videoAvailable);
    setAudio(audioAvailable);

    getUserMedia();

    connectToSocketServer();
  };

  // SCREEN SHARING FIX

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      window.localStream = stream;
      localVideoRef.current.srcObject = stream;

      // Replace tracks for all peers
      for (let id in connections) {
        const conn = connections[id];

        let videoSender = conn
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(stream.getVideoTracks()[0]);
        }

        if (stream.getAudioTracks().length) {
          let audioSender = conn
            .getSenders()
            .find((s) => s.track.kind === "audio");
          if (audioSender) {
            audioSender.replaceTrack(stream.getAudioTracks()[0]);
          }
        }

        conn
          .createOffer()
          .then((desc) => conn.setLocalDescription(desc))
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: conn.localDescription })
            );
          });
      }

      // When screen share stops → restore camera
      stream.getVideoTracks()[0].onended = () => {
        setScreen(false);
        getUserMedia();
      };
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (screen) startScreenShare();
  }, [screen]);

  // 📞 END CALL

  const handleEndCall = () => {
    try {
      window.localStream?.getTracks().forEach((t) => t.stop());
    } catch {}

    socketRef.current?.disconnect();
    navigate("/home");
  };

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      window.localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      {askForUsername ? (
        <div className={styles.lobbyContainer}>
          <div className={styles.lobbyCard}>
            <h2 className={styles.lobbyHeading}>Enter into Lobby</h2>

            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="outlined"
              fullWidth
            />

            <div className={styles.videoPreviewWrapper}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className={styles.localVideo}
              ></video>
            </div>

            <Button
              variant="contained"
              color="primary"
              onClick={connect}
              className={styles.connectButton}
            >
              CONNECT
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.meetVideoContainer}>
            {/* CHAT SIDEBAR */}
            {showModal && (
              <div className={styles.chatRoom}>
                <div className={styles.chatContainer}>
                  <h1>CHAT</h1>
                  <div ref={chatScrollRef} className={styles.chattingDisplay}>
                    {messages.map((item, i) => (
                      <div key={i} style={{ marginBottom: "12px" }}>
                        <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                        <p>{item.data}</p>
                      </div>
                    ))}
                  </div>

                  <div className={styles.chattingArea}>
                    <TextField
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      label="Enter your chat"
                    />
                    <Button
                      variant="contained"
                      onClick={() => {
                        socketRef.current.emit(
                          "chat-message",
                          message,
                          username
                        );
                        setMessage("");
                      }}
                    >
                      send
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* BUTTONS */}
            <div className={styles.buttonContainers}>
              <IconButton
                onClick={() => setVideo(!video)}
                style={{ color: "#fff" }}
              >
                {video ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>

              <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                <CallEndIcon />
              </IconButton>

              <IconButton
                onClick={() => setAudio(!audio)}
                style={{ color: "#fff" }}
              >
                {audio ? <MicIcon /> : <MicOffIcon />}
              </IconButton>

              {screenAvailable && (
                <IconButton
                  onClick={() => setScreen(!screen)}
                  style={{ color: "#fff" }}
                >
                  {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                </IconButton>
              )}

              <Badge badgeContent={newMessages} color="secondary">
                <IconButton
                  onClick={() => {
                    setModal((p) => {
                      const open = !p;
                      if (open) setNewMessages(0);
                      return open;
                    });
                  }}
                  style={{ color: "#fff" }}
                >
                  <ChatIcon />
                </IconButton>
              </Badge>
            </div>

            {/* LOCAL VIDEO */}
            <video
              className={styles.meetUserVideo}
              ref={localVideoRef}
              autoPlay
              muted
            />

            {/* REMOTE USERS */}
            <div className={styles.conferenceView}>
              {videos.map((v) => (
                <div key={v.socketId}>
                  <video
                    autoPlay
                    playsInline
                    ref={(ref) => {
                      if (ref && v.stream) ref.srcObject = v.stream;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
