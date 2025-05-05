import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfileImageUrl } from '@/utils/profileImageUtils';

interface IncomingCallNotificationProps {
  callerName: string;
  callerProfilePicture?: string | { url: string };
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  callerName,
  callerProfilePicture,
  onAccept,
  onReject
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80 overflow-hidden">
      <div className="bg-emerald-50 p-3 flex items-center justify-between border-b border-emerald-100">
        <div className="flex items-center">
          <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
          <h3 className="font-semibold text-emerald-800">Incoming Video Call</h3>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Avatar className="h-14 w-14 mr-4">
            <AvatarImage 
              src={getProfileImageUrl(callerProfilePicture)} 
              alt={callerName} 
            />
            <AvatarFallback>{callerName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900">{callerName}</p>
            <p className="text-sm text-gray-500">is calling you...</p>
          </div>
        </div>
        
        <div className="flex justify-between gap-3">
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600"
            onClick={onReject}
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Decline
          </Button>
          <Button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            onClick={onAccept}
          >
            <Phone className="h-4 w-4 mr-2" />
            Answer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification; 