import React, { useEffect, useState } from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  username?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, username }) => {
  const [dots, setDots] = useState('.');
  
  // Animation effect for dots
  useEffect(() => {
    if (!isTyping) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [isTyping]);
  
  if (!isTyping) return null;
  
  return (
    <div className="px-4 py-2 text-xs text-gray-500 animate-pulse">
      <span className="italic">
        {username ? `${username} is typing` : 'Someone is typing'}{dots}
      </span>
    </div>
  );
};

export default TypingIndicator; 