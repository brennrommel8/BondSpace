import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  StreamVideo,
  StreamVideoClient,
  Call,
  SpeakerLayout,
  useCall,
} from '@stream-io/video-react-sdk';
import { generateStreamToken } from '@/utils/streamUtils';

interface VideoCallProps {
  roomId: string;
  remoteUserId: string;
  remoteUserName: string;
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  remoteUserId,
  remoteUserName,
  onEndCall,
}) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Initialize Stream client
  useEffect(() => {
    const initClient = async () => {
      try {
        // Generate token for the user
        const token = await generateStreamToken(remoteUserId, remoteUserName);

        const client = new StreamVideoClient({
          apiKey: '4jn8epjtj47y',
          token,
          user: {
            id: remoteUserId,
            name: remoteUserName,
          },
        });

        setClient(client);

        // Create a call
        const call = client.call('default', roomId);
        await call.getOrCreate();
        setCall(call);

        // Join the call
        await call.join({ create: true });

        return () => {
          call.leave();
          client.disconnectUser();
        };
      } catch (error) {
        console.error('Error initializing Stream client:', error);
        toast.error('Failed to initialize video call');
        onEndCall();
      }
    };

    initClient();
  }, [roomId, remoteUserId, remoteUserName]);

  // Call controls component
  const CallControlsComponent = () => {
    const call = useCall();

    if (!call) return null;

    return (
      <div className="flex items-center justify-center gap-4 p-4 bg-black bg-opacity-50">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-12 w-12 ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white border-none' : 'text-white border-white'}`}
          onClick={() => {
            call.camera.toggle();
            setIsMuted(!isMuted);
          }}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600"
          onClick={() => {
            call.leave();
            onEndCall();
          }}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className={`rounded-full h-12 w-12 ${!isVideoEnabled ? 'bg-red-500 hover:bg-red-600 text-white border-none' : 'text-white border-white'}`}
          onClick={() => {
            call.microphone.toggle();
            setIsVideoEnabled(!isVideoEnabled);
          }}
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
      </div>
    );
  };

  if (!client || !call) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-pulse h-24 w-24 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Phone className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-xl font-medium">Initializing call...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      <StreamVideo client={client}>
        <div className="relative flex-1 bg-gray-900">
          <SpeakerLayout
            VideoPlaceholder={() => (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <div className="animate-pulse h-24 w-24 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Phone className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-xl font-medium">Waiting for participant...</h3>
                </div>
              </div>
            )}
            PictureInPicturePlaceholder={() => (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <div className="animate-pulse h-12 w-12 bg-emerald-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            )}
          />
        </div>
        <CallControlsComponent />
      </StreamVideo>
    </div>
  );
};

export default VideoCall; 