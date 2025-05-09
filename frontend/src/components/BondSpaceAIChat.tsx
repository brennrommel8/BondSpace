import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { bondspaceApi } from '@/api/bondspaceApi';
import { ChatMessage } from '@/types/bondspace.types';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  code?: {
    language: string;
    code: string;
  };
}

const SYSTEM_INSTRUCTION = `You are BondSpace AI, an AI assistant focused on helping users with their social connections and relationships. 
You provide advice on making friends, improving social skills, understanding social dynamics, and relationship advice. 
Be empathetic, supportive, and practical in your responses.
Always identify yourself as "BondSpace AI" at the start of your responses.
Remember that you are a specialized AI assistant for social connections and relationships.

When generating code:
1. Always specify the programming language
2. Format code blocks with proper indentation
3. Include comments explaining the code
4. Use markdown code blocks with language specification
5. Provide a brief explanation before and after the code`;

const BondSpaceAIChat: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I am BondSpace AI, your AI assistant for social connections. How can I help you today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(true);

  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      setIsTestingConnection(true);
      try {
        const connected = await bondspaceApi.testConnection();
        setIsConnected(connected);
        if (!connected) {
          toast.error('Unable to connect to BondSpace AI. Please try again later.');
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        setIsConnected(false);
        toast.error('Unable to connect to BondSpace AI. Please try again later.');
      } finally {
        setIsTestingConnection(false);
      }
    };

    testConnection();
  }, []);

  // Function to parse code blocks from text
  const parseCodeBlocks = (text: string): { text: string; code?: { language: string; code: string } } => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const matches = [...text.matchAll(codeBlockRegex)];
    
    if (matches.length === 0) {
      return { text };
    }

    const lastMatch = matches[matches.length - 1];
    const language = lastMatch[1] || 'plaintext';
    const code = lastMatch[2].trim();
    
    // Remove the code block from the text
    const textWithoutCode = text.replace(codeBlockRegex, '').trim();
    
    return {
      text: textWithoutCode,
      code: {
        language,
        code
      }
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const chatMessages: ChatMessage[] = [
        {
          role: 'user',
          content: inputValue
        }
      ];

      const response = await bondspaceApi.sendChatMessage({
        messages: chatMessages,
        systemInstruction: SYSTEM_INSTRUCTION
      });

      if (!response.reply) {
        throw new Error('Invalid response from server: missing reply');
      }

      // Parse the response for code blocks
      const { text, code } = parseCodeBlocks(response.reply);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text,
        isUser: false,
        timestamp: new Date(),
        code
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorText = error.message || 'Sorry, I encountered an error while processing your message. Please try again.';
      
      // Check if it's an authentication error
      if (error.message?.includes('Authentication required')) {
        errorText = 'Please sign in to continue chatting with BondSpace AI.';
        setIsConnected(false);
      }
      // Check if it's a service unavailable error
      else if (error.message?.includes('service is currently unavailable')) {
        errorText = 'BondSpace AI is currently unavailable. Please try again later.';
        setIsConnected(false);
      }
      // Check if it's a permission error
      else if (error.message?.includes('permission')) {
        errorText = 'You do not have permission to use BondSpace AI.';
        setIsConnected(false);
      }
      
      toast.error(errorText);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-white flex flex-col">
      <div className="max-w-4xl mx-auto w-full p-6 flex-1 flex flex-col">
        <div className="flex items-center mb-6">
          <div className="relative w-12 h-12 mr-3">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl transform rotate-45"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <div className="w-3 h-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded transform -rotate-45"></div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">BondSpace AI</h2>
            <p className="text-sm text-gray-500">Your AI assistant for social connections</p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Welcome to BondSpace AI!</h3>
          <p className="text-gray-600 mb-4">
            I'm here to help you with your social connections and code generation. You can ask me about:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Making new friends</li>
            <li>Improving your social skills</li>
            <li>Understanding social dynamics</li>
            <li>Getting advice on relationships</li>
            <li>Generating code examples</li>
            <li>Code explanations and best practices</li>
            <li>And much more!</li>
          </ul>
        </div>

        {/* Connection Status */}
        {isTestingConnection ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4">
            <p className="font-medium">Connecting to BondSpace AI...</p>
            <div className="flex space-x-2 mt-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        ) : !isConnected && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p className="font-medium">Connection Error</p>
            <p className="text-sm">Unable to connect to BondSpace AI. Please check your internet connection and try again.</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white"
            >
              Retry Connection
            </Button>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.isUser
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-gray-700'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.code && (
                  <div className="mt-4 rounded-lg overflow-hidden">
                    <SyntaxHighlighter
                      language={message.code.language}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {message.code.code}
                    </SyntaxHighlighter>
                  </div>
                )}
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-emerald-50 p-4 rounded-lg text-gray-700">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Container */}
        <div className="flex gap-2 mt-auto">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isTestingConnection
                ? "Connecting to BondSpace AI..."
                : isConnected
                ? "Type your message..."
                : "Connection error. Please try again later."
            }
            className="flex-1"
            disabled={isLoading || !isConnected || isTestingConnection}
          />
          <Button
            onClick={handleSendMessage}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading || !isConnected || isTestingConnection}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BondSpaceAIChat;