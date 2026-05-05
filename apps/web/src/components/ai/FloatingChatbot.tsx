import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader, Trash2 } from 'lucide-react';
import { sendChatMessage, type ChatMessage } from '@/api/ai/chatbot';

const CHAT_STORAGE_KEY = 'rentverse_chatbot_history';

interface MessageWithMetadata extends ChatMessage {
  metadata?: {
    sentiment?: string;
    sentiment_score?: number;
    requires_escalation?: boolean;
    suggested_actions?: string[];
  };
}

const ACTION_ROUTES: Record<string, string> = {
  'Browse listings': '/marketplace/browse',
  'Browse products': '/marketplace/browse',
  'Browse by category': '/categories',
  'Create listing': '/dashboard/listings/create',
  'Create rental': '/dashboard/rentals/create',
  'View rentals': '/dashboard/rentals',
  'Contact support': 'mailto:support@rentverse.pk',
  'Browse all products': '/marketplace/browse',
  'View available products': '/marketplace/browse',
};

const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageWithMetadata[]>([
    {
      role: 'assistant',
      content: 'Hi! 👋 How can I help you today?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        // Fallback to default greeting if corrupted
        setMessages([
          {
            role: 'assistant',
            content: 'Hi! 👋 How can I help you today?',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: MessageWithMetadata = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(inputValue);
      const assistantMessage: MessageWithMetadata = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        metadata: {
          sentiment: response.sentiment,
          sentiment_score: response.sentiment_score,
          requires_escalation: response.requires_escalation,
          suggested_actions: response.suggested_actions,
        },
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: MessageWithMetadata = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    const route = ACTION_ROUTES[action];
    if (route?.startsWith('mailto:')) {
      window.location.href = route;
    } else if (route) {
      window.location.href = route;
    } else {
      // If no route defined, suggestion fills the input
      setInputValue(action);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hi! 👋 How can I help you today?',
        timestamp: new Date().toISOString(),
      },
    ]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Chat Box */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">RentVerse Assistant</h3>
                <p className="text-xs text-white/80">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                title="Clear chat history"
                className="p-1 hover:bg-white/20 rounded-lg transition"
                aria-label="Clear chat"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Suggested Actions */}
                {msg.role === 'assistant' &&
                  msg.metadata?.suggested_actions &&
                  msg.metadata.suggested_actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-0">
                      {msg.metadata.suggested_actions.map((action, actionIdx) => (
                        <button
                          key={actionIdx}
                          onClick={() => handleActionClick(action)}
                          className="px-3 py-1 bg-gray-200 hover:bg-primary-200 text-gray-700 hover:text-primary-700 text-xs rounded-full transition border border-gray-300 hover:border-primary-400"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                {/* Escalation Indicator */}
                {msg.role === 'assistant' && msg.metadata?.requires_escalation && (
                  <div className="flex justify-start">
                    <div className="text-xs px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-lg">
                      Support team will contact you soon 🔗
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center text-white font-semibold ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700'
        }`}
        aria-label="Open chat"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="flex items-center justify-center">
            <MessageCircle size={24} fill="currentColor" />
          </div>
        )}
      </button>
    </div>
  );
};

export default FloatingChatbot;

