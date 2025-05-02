// Chat API service functions
import { ChatResponse } from './types';
import { supabase, getCurrentUser } from '@/lib/supabase';

const ENDPOINT = "https://oiffhjrgslgblewwonrs.supabase.co/functions/v1/test";

/**
 * Event listener type for chat streaming events
 */
export type ChatEventListener = {
  onData?: (data: string) => void;
  onSources?: (sources: ChatResponse['sources']) => void;
  onComplete?: (response: ChatResponse) => void;
  onError?: (error: string) => void;
};

/**
 * Fetches a chat response based on the provided question
 * @param question The user's question
 * @param context Optional context information
 * @param eventListener Optional event listener for streaming updates
 * @returns A promise that resolves to a ChatResponse
 */
export const fetchChatResponse = async (
  question: string, 
  context?: { key: string; value: string }[],
  eventListener?: ChatEventListener
): Promise<ChatResponse> => {
  console.log('🚀 Starting chat request:', { question, context });
  
  // Get the current user ID
  let userId = 'anonymous';
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      userId = currentUser.id;
      console.log('👤 User identified:', userId);
    } else {
      console.log('👤 Anonymous user');
    }
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
    // Continue with anonymous ID if there's an error
  }

  // Log the search query to Supabase
  try {
    if (userId !== 'anonymous') {
      await supabase.from('logs').insert([
        {
          user_id: userId,
          event_type: 'search',
          event_data: { query: question }
        }
      ]);
      console.log('✅ Query logged to Supabase');
    }
  } catch (error) {
    console.error('❌ Error logging search query:', error);
  }

  // Convert context to chat history format
  const history = context?.map(ctx => ({
    role: ctx.key.startsWith('msg_') ? 'user' : 'model',
    text: ctx.value
  })) || [];

  console.log('📨 Sending request to edge function:', {
    query: question,
    historyLength: history.length,
    userId
  });

  // Call the edge function
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: question,
      user_id: userId,
      history
    })
  });

  console.log('📡 Edge function response status:', response.status);

  if (!response.body) {
    console.error('❌ No response body received');
    throw new Error('No response body received');
  }

  // Handle streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullAnswer = '';
  let sourcesCache: ChatResponse['sources'] = [];

  console.log('🔄 Starting stream processing');

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      console.log('✅ Stream complete');
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || ''; // Keep incomplete chunk

    for (const chunk of chunks) {
      if (!chunk.startsWith('event:')) continue;

      const [evLine, dataLine] = chunk.split('\n');
      const event = evLine.replace('event: ', '').trim();
      const data = JSON.parse(dataLine.replace('data: ', '') || '{}');

      console.log('📦 Received event:', { event, dataPreview: typeof data === 'string' ? data.slice(0, 100) : data });

      switch (event) {
        case 'data':
          fullAnswer += data;
          eventListener?.onData?.(data);
          break;
        case 'sources':
          sourcesCache = Array.isArray(data) ? data : data.sources;
          console.log('📚 Sources received:', sourcesCache.length);
          eventListener?.onSources?.(sourcesCache);
          break;
        case 'result': {
          console.log('✨ Final result received');
          const finalResponse = {
            text: data.text || fullAnswer,
            sources: data.sources || sourcesCache
          };
          eventListener?.onComplete?.(finalResponse);
          return finalResponse;
        }
        case 'error': {
          const errorMsg = data.error || 'Unknown error occurred';
          console.error('❌ Error event received:', errorMsg);
          eventListener?.onError?.(errorMsg);
          throw new Error(errorMsg);
        }
      }
    }
  }

  // If we get here without a result event, return what we have
  console.log('⚠️ No result event received, returning accumulated data');
  const finalResponse = {
    text: fullAnswer,
    sources: sourcesCache
  };
  eventListener?.onComplete?.(finalResponse);
  return finalResponse;
};