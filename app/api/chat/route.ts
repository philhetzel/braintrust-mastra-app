import { mastra } from '../../../mastra';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    
    if (!latestMessage?.content) {
      return new Response('Message content is required', { status: 400 });
    }
    
    // Get the weather agent from Mastra
    const agent = mastra.getAgent('weatherAgent');
    
    // Generate response using the weather agent
    const result = await agent.generate(latestMessage.content);
    
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