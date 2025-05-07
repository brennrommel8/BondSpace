import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/utils/socketUtils';
import { toast } from 'sonner';

interface VideoCallProps {
  roomId: string;
  remoteUserId: string;
  remoteUserName: string;
  onEndCall: () => void;
  isIncoming?: boolean;
  isAnswered?: boolean;
}

const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  remoteUserId,
  remoteUserName,
  onEndCall,
  isIncoming = false,
  isAnswered = false,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebRTC and Socket.IO connection
  useEffect(() => {
    const initializeCall = async () => {
      try {
        setIsConnecting(true);
        setConnectionError(null);

        // Get local media stream with mobile-friendly constraints
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            aspectRatio: 1.777777778
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        setStream(mediaStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
        
        // Initialize Socket.IO connection
        const socket = getSocket();
        
        if (!socket) {
          throw new Error('Unable to connect to the server');
        }
        
        socketRef.current = socket;
        
        // Create RTCPeerConnection with additional STUN/TURN servers
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        });
        
        peerConnectionRef.current = peerConnection;
        
        // Add local tracks to the connection
        mediaStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, mediaStream);
        });
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            socket.emit('signalData', {
              to: remoteUserId,
              type: 'ice-candidate',
              payload: event.candidate,
              roomId
            });
          }
        };
        
        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log('Connection state:', peerConnection.connectionState);
          if (peerConnection.connectionState === 'connected') {
            setIsConnecting(false);
            console.log('WebRTC connection established');
          } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
            setConnectionError(`Connection ${peerConnection.connectionState}`);
            console.log('WebRTC connection state:', peerConnection.connectionState);
          }
        };

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', peerConnection.iceConnectionState);
          if (peerConnection.iceConnectionState === 'failed') {
            setConnectionError('Connection failed. Please try again.');
          }
        };
        
        // Handle remote tracks
        peerConnection.ontrack = (event) => {
          console.log('Received remote track:', event.streams[0]);
          const remote = new MediaStream();
          event.streams[0].getTracks().forEach(track => {
            remote.addTrack(track);
          });
          setRemoteStream(remote);
          setIsConnecting(false);
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remote;
          }
        };
        
        // Join the call room
        socket.emit('joinCall', roomId);
        
        // Handle incoming signal data
        socket.on('signalReceived', async (data) => {
          try {
            if (data.roomId !== roomId) return;
            
            console.log('Received signal:', data.type);
            
            if (data.type === 'offer') {
              console.log('Received offer, setting remote description');
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload));
              console.log('Creating answer');
              const answer = await peerConnection.createAnswer();
              console.log('Setting local description (answer)');
              await peerConnection.setLocalDescription(answer);
              
              console.log('Sending answer');
              socket.emit('signalData', {
                to: remoteUserId,
                type: 'answer',
                payload: answer,
                roomId
              });
            } 
            else if (data.type === 'answer') {
              console.log('Received answer, setting remote description');
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload));
            } 
            else if (data.type === 'ice-candidate') {
              console.log('Received ICE candidate, adding to peer connection');
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.payload));
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
              }
            }
          } catch (error) {
            console.error('Error handling signal:', error);
            setConnectionError('Error establishing connection');
          }
        });
        
        // Handle call ended event
        socket.on('callEnded', () => {
          endCall();
        });

        // Handle user joined call event
        socket.on('userJoinedCall', (data) => {
          console.log('User joined call:', data);
          if (data.roomId === roomId) {
            // If we're the one who initiated the call, create and send the offer
            if (!isIncoming && isAnswered) {
              console.log('Creating offer for outgoing call');
              createOffer();
            }
          }
        });
        
        // If we're the one who initiated the call, create and send the offer immediately
        if (!isIncoming && isAnswered) {
          console.log('Creating offer for outgoing call');
          createOffer();
        }
      } catch (error) {
        console.error('Error setting up call:', error);
        setConnectionError('Failed to access camera and microphone');
        toast.error('Failed to access camera and microphone');
      }
    };
    
    initializeCall();
    
    // Cleanup function
    return () => {
      cleanupCall();
    };
  }, [roomId, remoteUserId, isIncoming, isAnswered]);

  // Create and send an offer
  const createOffer = async () => {
    try {
      if (!peerConnectionRef.current || !socketRef.current) return;
      
      console.log('Creating offer...');
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true
      });
      
      console.log('Setting local description (offer)');
      await peerConnectionRef.current.setLocalDescription(offer);
      
      console.log('Sending offer');
      socketRef.current.emit('signalData', {
        to: remoteUserId,
        type: 'offer',
        payload: offer,
        roomId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      setConnectionError('Error creating connection offer');
    }
  };

  // End the call
  const endCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('endCall', {
        roomId,
        to: remoteUserId
      });
    }
    
    cleanupCall();
    onEndCall();
  };

  // Clean up resources
  const cleanupCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.off('signalReceived');
      socketRef.current.off('callEnded');
      socketRef.current.emit('leaveCall', roomId);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      {/* Main video */}
      <div className="relative flex-1 bg-gray-900">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="animate-pulse h-24 w-24 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Phone className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-medium">Connecting to {remoteUserName}...</h3>
              <p className="mt-2 text-gray-400">
                {isConnecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Establishing connection...
                  </span>
                ) : connectionError || "Please wait while we establish the connection"}
              </p>
            </div>
          </div>
        )}
        
        {/* Small self-view */}
        <div className={`absolute bottom-4 right-4 w-1/4 max-w-[200px] aspect-video rounded-lg overflow-hidden border-2 border-white shadow-lg ${isConnecting ? 'opacity-50' : ''}`}>
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        </div>
      </div>
      
      {/* Call controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-black bg-opacity-50">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-12 w-12 ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white border-none' : 'text-white border-white'}`}
          onClick={toggleAudio}
          disabled={isConnecting}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        
        <Button
          className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600"
          onClick={endCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-12 w-12 ${!isVideoEnabled ? 'bg-red-500 hover:bg-red-600 text-white border-none' : 'text-white border-white'}`}
          onClick={toggleVideo}
          disabled={isConnecting}
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
};

export default VideoCall; 