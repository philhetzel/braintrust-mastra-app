import { mastra } from "../../../mastra";
import { initLogger, traced } from "braintrust";

const logger = initLogger({ projectName: "MastraApp" });

// In-memory storage for full conversations (in production, use Redis or database)
const conversationStore = new Map<string, any[]>();

// Generate a simple session ID (in production, use proper session management)
function getSessionId(req: Request): string {
  // You could use headers, cookies, or other methods for session identification
  // For now, we'll use a simple approach
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  return `session_${Buffer.from(userAgent + ip).toString('base64').slice(0, 16)}`;
}

export async function POST(req: Request) {
  return traced(
    async (span) => {
      try {
        const { messages } = await req.json();
        const sessionId = getSessionId(req);

        if (!messages || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        // Get or initialize the full conversation history for this session
        let fullConversation = conversationStore.get(sessionId) || [];
        
        // Add the new user message to the full conversation
        const newUserMessage = messages[messages.length - 1];
        if (newUserMessage.role === 'user') {
          fullConversation.push(newUserMessage);
        }

        // Get the weather agent from Mastra
        const agent = mastra.getAgent("weatherAgent");

        // Use the full conversation history (including previous tool calls)
        const result = await agent.generate(fullConversation);

        // Log the full result object to see what's available
        console.log("Full Mastra result:", JSON.stringify(result, null, 2));

        // Extract the full conversation from the result if available
        if (result.response && result.response.messages) {
          // Update our stored conversation with the complete message history including tool calls
          fullConversation = result.response.messages;
          conversationStore.set(sessionId, fullConversation);
        } else {
          // Fallback: just add the assistant response
          fullConversation.push({
            role: 'assistant',
            content: result.text
          });
          conversationStore.set(sessionId, fullConversation);
        }

        // Create a streaming response that's compatible with useChat
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          start(controller) {
            // Send the response as a data stream format that useChat expects
            const chunk = `0:"${result.text.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"\n`;
            controller.enqueue(encoder.encode(chunk));
            controller.close();
          },
        });

        // Enhanced logging to Braintrust with full conversation context
        span.log({
          input:  fullConversation, // Complete conversation with tool calls,
          output:  result.text,
        });

        // Log conversation history separately for debugging

        console.log("Session ID:", sessionId);

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
          },
        });
      } catch (error) {
        console.error("Error in chat API:", error);

        // Return a more specific error message based on the error type
        if (error instanceof Error) {
          return new Response(`Error: ${error.message}`, { status: 500 });
        }

        return new Response(
          "Sorry, I encountered an unexpected error while processing your request.",
          {
            status: 500,
          }
        );
      }
    },
    { name: "POST /api/chat", type: "llm" }
  );
}
