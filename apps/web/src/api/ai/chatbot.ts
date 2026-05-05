import { apiJsonRequest } from '@/api/clients';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: {
    sentiment?: string;
    sentiment_score?: number;
    requires_escalation?: boolean;
    suggested_actions?: string[];
    citations?: any[];
  };
}

export interface ChatResponse {
  message: string;
  sentiment: string;
  sentiment_score: number;
  requires_escalation: boolean;
  suggested_actions: string[];
  citations?: any[];
}

/**
 * Send a message to the AI chatbot backend.
 * The backend handles RAG retrieval and response generation via Groq.
 */
export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  try {
    console.log('[Chatbot] Sending message:', message);
    // Call the Node proxy which forwards to FastAPI
    const data = await apiJsonRequest<any>('/ai/chat', {
      method: 'POST',
      auth: false,
      body: {
        message: message.trim(),
      },
    });

    console.log('[Chatbot] Received response:', data);
    
    // Build suggested actions from citations
    let suggested_actions: string[] = [];
    const citations = data?.citations || [];
    
    // Check if product browsing action is present
    const hasProductAction = citations.some((c: any) => c.source_id === 'browse_products');
    if (hasProductAction) {
      suggested_actions.push('Browse all products');
    }
    
    // Map backend response (reply + citations) to ChatResponse
    // The backend returns { reply: string, citations: array }
    return {
      message: data?.reply || data?.message || "",
      sentiment: data?.sentiment || 'neutral',
      sentiment_score: data?.sentiment_score !== undefined ? data.sentiment_score : 0.5,
      requires_escalation: Boolean(data?.requires_escalation),
      suggested_actions: suggested_actions.length > 0 ? suggested_actions : data?.suggested_actions || [],
      citations: citations,
    } as ChatResponse;
  } catch (error) {
    console.error('[Chatbot] Error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Fallback to simple response if backend unavailable
    return {
      message:
        "I'm having trouble connecting to the server (check console for details). Please try again or contact support@rentverse.pk",
      sentiment: 'unknown',
      sentiment_score: 0,
      requires_escalation: false,
      suggested_actions: ['Contact support', 'Refresh page'],
    };
  }
};

/**
 * Optional: Send message with conversation history for better context.
 */
export const sendChatMessageWithHistory = async (
  message: string
): Promise<ChatResponse> => {
  // For now, backend doesn't use history. Can extend later for multi-turn conversation support.
  return sendChatMessage(message);
};

