import { mastra } from "../../../mastra";
import { initLogger, traced } from "braintrust";
import dotenv from "dotenv";
dotenv.config();

initLogger({ projectName: process.env.BRAINTRUST_PROJECT_NAME });

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
        const fullConversation = conversationStore.get(sessionId) || [];
        
        // Add the new user message to the full conversation
        const newUserMessage = messages[messages.length - 1];
        if (newUserMessage.role === 'user') {
          fullConversation.push(newUserMessage);
        }

        // Get the weather agent from Mastra
        const agent = mastra.getAgent("weatherAgent");

        // Capture the input state BEFORE agent processing (for Braintrust logging)
        const inputForBraintrust = [
          {
            role: 'system',
            content: agent.getInstructions() || 'You are a helpful weather assistant.'
          },
          ...fullConversation  // This is the conversation state including user's message, BEFORE agent response
        ];

        // Use the full conversation history (including previous tool calls)
        const result = await agent.generate(fullConversation);

        // Log the full result object to see what's available
        console.log("Full Mastra result:", JSON.stringify(result, null, 2));

        // Extract the full conversation from the result if available
        if (result.response && result.response.messages) {
          // result.response.messages contains only the agent's response (tool calls, tool results, assistant messages)
          // We need to append these to our existing conversation to maintain full history
          fullConversation.push(...result.response.messages);
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

        // Create input: conversation state up to and including user's latest message + system message
        let inputMessages: any[] = [];
        let outputMessages: any[] = [];

        // Use the captured input state (before agent processing) and agent's response
        if (result.response && result.response.messages && result.response.messages.length > 0) {
          // Input: System message + conversation state up to and including user's latest message (captured before agent processing)
          inputMessages = inputForBraintrust;

          // Output: All of the agent's response messages (tool calls, tool results, assistant messages)
          outputMessages = result.response.messages;

        } else {
          // Fallback: use captured input for input, and result.text for output
          inputMessages = inputForBraintrust;
          outputMessages = [{
            role: 'assistant',
            content: result.text
          }];
        }
        
        span.log({
          input: inputMessages, // System + all messages before and including user's latest interaction
          output: outputMessages, // All agent activity after user's latest interaction
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
