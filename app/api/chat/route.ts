import { mastra } from '../../../mastra';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }
    
    // Get the weather agent from Mastra
    const agent = mastra.getAgent('weatherAgent');
    
    // Convert the chat messages to the format expected by Mastra
    // For multi-turn conversation, we'll send the full conversation history
    const conversationHistory = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Generate response using the weather agent with full conversation context
    // The agent's memory system will automatically maintain context across turns
    const result = await agent.generate(conversationHistory);
    
    // Create a streaming response that's compatible with useChat
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        // Send the response as a data stream format that useChat expects
        const chunk = `0:"${result.text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
        controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
    
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Return a more specific error message based on the error type
    if (error instanceof Error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
    
    return new Response('Sorry, I encountered an unexpected error while processing your request.', {
      status: 500,
    });
  }
} 