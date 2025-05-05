import React, { useState } from 'react';
import { forceReconnect } from '@/utils/socketUtils';
import useSocket from '@/hooks/useSocket';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SocketConnectionStatusProps {
  showControls?: boolean;
}

const SocketConnectionStatus: React.FC<SocketConnectionStatusProps> = ({ 
  showControls = true  // Default to true to always show controls
}) => {
  const { isConnected } = useSocket();
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      console.log("Attempting to reconnect to Socket.IO server...");
      
      // Use our new force reconnect function
      const reconnected = await forceReconnect();
      
      if (reconnected) {
        console.log("Successfully reconnected to Socket.IO!");
      } else {
        console.log("Failed to reconnect to Socket.IO server");
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  // If everything is connected normally, just show a subtle connected indicator
  if (isConnected) {
    return (
      <div className="flex items-center text-xs text-green-600 mb-2">
        <Wifi className="h-3 w-3 mr-1" />
        <span>Real-time messaging connected</span>
      </div>
    );
  }

  // If not connected, show reconnect option
  return (
    <div className="flex items-center justify-between text-xs bg-amber-50 p-2 rounded mb-2">
      <div className="flex items-center">
        <WifiOff className="h-3 w-3 mr-1 text-amber-600" />
        <span className="text-amber-700">Real-time updates unavailable</span>
      </div>
      {showControls && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-amber-700 hover:bg-amber-100"
          onClick={handleCheckStatus}
          disabled={checkingStatus}
        >
          {checkingStatus ? (
            <span className="h-3 w-3 border-2 border-t-transparent border-amber-700 rounded-full animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
};

export default SocketConnectionStatus; 