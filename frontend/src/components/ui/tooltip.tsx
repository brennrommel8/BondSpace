import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface TooltipProviderProps {
  children: React.ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
}

export function TooltipTrigger({ children }: TooltipTriggerProps) {
  return <>{children}</>;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
}

export function TooltipContent({ children, className = "" }: TooltipContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`absolute z-50 -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md ${className}`}
    >
      {children}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
    </motion.div>
  );
}

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  return (
    <div 
      className="relative inline-block" 
      ref={ref}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <TooltipContent>
            {content}
          </TooltipContent>
        )}
      </AnimatePresence>
    </div>
  );
} 