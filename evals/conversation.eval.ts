import { Eval, initDataset} from "braintrust";
import { mastra } from "../mastra";
import {Faithfulness, LLMClassifierFromTemplate} from "autoevals";
import dotenv from "dotenv";
dotenv.config();

const projectName = process.env.BRAINTRUST_PROJECT_NAME as string;

async function task(input: any, hooks: any) {
    const agent = mastra.getAgent("weatherAgent");
    const result = await agent.generate(input);

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
    
    hooks.metadata.eval_tool_info = toolInfo;
    
    // Return the final assistant's message
    const finalAssistantMessage = outputMessages
        .filter(msg => msg.role === 'assistant' && msg.content)
        .pop();
    
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
    
    if (metadata.tool_info) {
        metadata.tool_info.forEach((msg: any) => {
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
    task: task,
    data: initDataset({project: projectName, dataset: "WeatherActivityDataset"}),
    scores: [toolCallCheck, structureCheck, faithfulnessCheck]
});