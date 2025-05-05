import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/utils/socketUtils';
import { toast } from 'sonner';

interface VideoCallProps {
  roomId: string;
  recipientId: string;
  recipientName: string;
  onEndCall: () => void;
  isIncoming?: boolean;
  isAnswered?: boolean;
}

const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  recipientId,
  recipientName,
  onEndCall,
  isIncoming = false,
  isAnswered = false,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebRTC and Socket.IO connection
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Get local media stream
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setStream(mediaStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
        
        // Initialize Socket.IO connection
        const socket = getSocket();
        
        if (!socket) {
          toast.error('Unable to connect to the server');
          return;
        }
        
        socketRef.current = socket;
        
        // Create RTCPeerConnection with STUN/TURN servers
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        });
        
        peerConnectionRef.current = peerConnection;
        
        // Add local tracks to the connection
        mediaStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, mediaStream);
        });
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('signalData', {
              to: recipientId,
              type: 'ice-candidate',
              payload: event.candidate,
              roomId
            });
          }
        };
        
        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === 'connected') {
            console.log('WebRTC connection established');
          } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
            console.log('WebRTC connection state:', peerConnection.connectionState);
          }
        };
        
        // Handle remote tracks
        peerConnection.ontrack = (event) => {
          const remote = new MediaStream();
          event.streams[0].getTracks().forEach(track => {
            remote.addTrack(track);
          });
          setRemoteStream(remote);
          
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
            
            if (data.type === 'offer') {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload));
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              
              socket.emit('signalData', {
                to: recipientId,
                type: 'answer',
                payload: answer,
                roomId
              });
            } 
            else if (data.type === 'answer') {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload));
            } 
            else if (data.type === 'ice-candidate') {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.payload));
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
              }
            }
          } catch (error) {
            console.error('Error handling signal:', error);
          }
        });
        
        // Handle call ended event
        socket.on('callEnded', () => {
          endCall();
        });
        
        // Initiate call if not an incoming call
        if (!isIncoming && isAnswered) {
          createOffer();
        }
      } catch (error) {
        console.error('Error setting up call:', error);
        toast.error('Failed to access camera and microphone');
      }
    };
    
    initializeCall();
    
    // Cleanup function
    return () => {
      cleanupCall();
    };
  }, [roomId, recipientId, isIncoming, isAnswered]);

  // Create and send an offer
  const createOffer = async () => {
    try {
      if (!peerConnectionRef.current || !socketRef.current) return;
      
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      socketRef.current.emit('signalData', {
        to: recipientId,
        type: 'offer',
        payload: offer,
        roomId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  // End the call
  const endCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('endCall', {
        roomId,
        to: recipientId
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
              <h3 className="text-xl font-medium">Connecting to {recipientName}...</h3>
              <p className="mt-2 text-gray-400">Please wait while we establish the connection</p>
            </div>
          </div>
        )}
        
        {/* Small self-view */}
        <div className="absolute bottom-4 right-4 w-1/4 max-w-[200px] aspect-video rounded-lg overflow-hidden border-2 border-white shadow-lg">
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
      <div className="py-4 px-6 bg-gray-800 flex items-center justify-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-12 w-12 ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white border-none' : 'text-white border-white'}`}
          onClick={toggleAudio}
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
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
};

export default VideoCall; 