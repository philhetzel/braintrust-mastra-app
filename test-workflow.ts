import { mastra } from './mastra';

async function testWeatherAgent() {
  try {
    console.log('Testing Weather Agent with Activities...');
    
    const agent = mastra.getAgent('weatherAgent');
    
    const response = await agent.generate([
      { 
        role: 'user', 
        content: 'What are some good activities to do in San Francisco on a sunny day?' 
      }
    ], {
      maxSteps: 5 // Allow multiple tool calls
    });
    
    console.log('Agent Response:');
    console.log(response.text);
    
  } catch (error) {
    console.error('Error running agent:', error);
  }
}

testWeatherAgent(); 