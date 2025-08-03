import { Eval, initDataset} from "braintrust";
import { mastra } from "../mastra";
import {Faithfulness, LLMClassifierFromTemplate} from "autoevals";
import dotenv from "dotenv";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { z } from "zod";
import { WeatherRuntimeContext } from "../mastra/agents/weather-agent";
dotenv.config();

const projectName = process.env.BRAINTRUST_PROJECT_NAME as string;

// Default instructions
const defaultInstructions = `
      You are a helpful weather assistant that provides accurate weather information and activity recommendations.

            `;

async function task(input: any, hooks: any) {
    const runtimeContext = new RuntimeContext<WeatherRuntimeContext>();
 
    runtimeContext.set("instructions", hooks.parameters.instructions);
    // Run the Mastra agent and gather results
    const agent = mastra.getAgent("weatherAgent");
    const result = await agent.generate(input, {runtimeContext});

    const outputMessages = result.response.messages;

    // Capture all tool call and tool result messages
    const toolInfo = outputMessages.filter(msg => {
        if (msg.role === 'tool') return true;
        if (msg.role === 'assistant') {
            // Check for any tool-related properties
            return 'toolInvocations' in msg || 'tool_calls' in msg || 'toolCalls' in msg;
        }
        return false;
    });
    
    // write tool call and tool result messages to task metadata
    if (!hooks) {
        console.error('Hooks object is undefined');
        throw new Error('Hooks object is required but was undefined');
    }
    
    // Initialize metadata if it doesn't exist
    if (!hooks.metadata) {
        hooks.metadata = {};
    }
    
    hooks.metadata.eval_tool_info = toolInfo;
    hooks.metadata.instructions = hooks.parameters.instructions;
    
    // Return the final assistant's message
    const finalAssistantMessage = outputMessages
        .filter(msg => msg.role === 'assistant' && msg.content)
        .pop();
    

    // Extract the content of the final assistant message and return as output
    const content = finalAssistantMessage?.content;
    if (typeof content === 'string') {
        return content;
    } else if (Array.isArray(content)) {
        // Extract text from content parts
        return content
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('');
    }
    
    return "";
}

async function toolCallCheck({ output, expected, inputs, metadata }: any) {
    // If no tool info is found, skip the scorer
    if (!metadata.eval_tool_info || !metadata.tool_info) {
        return null;
    }

    // Extract expected tools from metadata.tool_info
    const expectedTools = new Set();
    metadata.tool_info.forEach((msg: any) => {
        if (msg.content && Array.isArray(msg.content)) {
            msg.content.forEach((contentItem: any) => {
                if (contentItem.toolName) {
                    expectedTools.add(contentItem.toolName);
                }
            });
        }
    });

    // Extract actual tools from metadata.eval_tool_info
    const actualTools = new Set();
    metadata.eval_tool_info.forEach((msg: any) => {
        if (msg.content && Array.isArray(msg.content)) {
            msg.content.forEach((contentItem: any) => {
                if (contentItem.toolName) {
                    actualTools.add(contentItem.toolName);
                }
            });
        }
    });

    // Calculate overlap percentage with tool_info as denominator
    if (expectedTools.size === 0) {
        return {
            score: 0,
            name: "toolCallCheck",
            metadata: {
                expectedTools: Array.from(expectedTools),
                actualTools: Array.from(actualTools),
                overlap: 0,
                totalExpected: 0,
                totalActual: actualTools.size,
                reasoning: "No expected tools defined"
            }
        };
    }

    const overlap = [...expectedTools].filter(tool => actualTools.has(tool)).length;
    const score = overlap / expectedTools.size;
    
    // return the overlap score and metadata about the calculation
    return {
        score: score,
        name: "toolCallCheck",
        metadata: {
            expectedTools: Array.from(expectedTools),
            actualTools: Array.from(actualTools),
            overlap: overlap,
            totalExpected: expectedTools.size,
            totalActual: actualTools.size,
            missingTools: [...expectedTools].filter(tool => !actualTools.has(tool)),
            unexpectedTools: [...actualTools].filter(tool => !expectedTools.has(tool))
        }
    };
}

const structureCheck = LLMClassifierFromTemplate({
    name: "StructureCheck",
    promptTemplate: `Does the response adhere to the correct structure? (Y/N)
    Agents should provide answers in the following format:
     - Use **bold** for important information like temperature and weather conditions
      - Use headings to organize sections:
        - ## Weather in [Original City]
        - ## Activities in [Original City]
        - ## Nearby Options (only when user requests nearby cities)
        - ### [Nearby City Name] - Weather & Activities (for each nearby city when requested)
      - Use bullet points (-) for listing weather details and activities
      - Include links to activities when available using [Activity Name](URL) format
      - Use code blocks (\`\`) for specific data like coordinates or exact measurements
      - Format temperature with units clearly (e.g., **22°C** or **72°F**)
      - When showing nearby cities, include distance information (e.g., "**Springfield** (45km away)")
    {{output}}`,
    choiceScores: {
      Y: 1,
      N: 0,
    },
    useCoT: true,
    model: "gpt-4o-mini",
  });

async function faithfulnessCheck({ output, expected, input, metadata }: any) {
    // Extract descriptions from weatherActivitiesTool results
    const descriptions: string[] = [];
    
    // gather context from the Tavily activity search 
    if (metadata && metadata.eval_tool_info && metadata.tool_info) {
        metadata.eval_tool_info.forEach((msg: any) => {
            if (msg.content && Array.isArray(msg.content)) {
                msg.content.forEach((contentItem: any) => {
                    if (contentItem.toolName === 'weatherActivitiesTool' && 
                        contentItem.result && 
                        contentItem.result.activities) {
                        contentItem.result.activities.forEach((activity: any) => {
                            if (activity.description) {
                                descriptions.push(activity.description);
                            }
                        });
                    }
                });
            }
        });
    }
    
    // Combine all descriptions into a single context string
    const context = descriptions.join('\n\n');
    
    // If no descriptions found, return null or a default score
    if (descriptions.length === 0) {
        return null;
    }
    
    return Faithfulness({
        input: input,
        output: output, 
        context: context
    });
}

Eval(projectName, {
    experimentName: `weather-eval-${new Date().toISOString().split('T')[0]}`,
    task: async (input: any, hooks: any) => {
        // Store runtime values in test-case metadata
        hooks.metadata.actualInstructions = hooks.parameters.instructions;
        hooks.metadata.timestamp = new Date().toISOString();
        
        return task(input, hooks);
    },
    data: initDataset({project: projectName, dataset: "WeatherActivityDataset"}),
    scores: [toolCallCheck, structureCheck, faithfulnessCheck],
    parameters: {
        instructions: z.string()
        .describe("The instructions for the agent to follow")
        .default(defaultInstructions)
    },
    metadata: {
    }
});