import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { weatherTool } from '../tools/weather-tool';
import { weatherActivitiesTool } from '../tools/weather-activities-tool';
import { nearbyCitiesTool } from '../tools/nearby-cities-tool';
import { wrapAISDKModel } from 'braintrust';

export type WeatherRuntimeContext = {
  instructions: string;
}

const defaultInstructions = `
  You are a helpful weather assistant that provides accurate weather information and activity recommendations.
`;

export async function getChampionInstructions() {
  const BRAINTRUST_API_KEY = process.env.BRAINTRUST_API_KEY;
  const projectName = process.env.BRAINTRUST_PROJECT_NAME;
  
  if (!BRAINTRUST_API_KEY || !projectName) {
    throw new Error('BRAINTRUST_API_KEY and BRAINTRUST_PROJECT_NAME environment variables are required');
  }

  try {
    // First, get the project ID
    const projectsResponse = await fetch('https://api.braintrust.dev/v1/project', {
      headers: {
        'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
      },
    });
    
    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.statusText}`);
    }
    
    const projects = await projectsResponse.json();
    const project = projects.objects.find((p: any) => p.name === projectName);
    
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    // List experiments and find one with tag 'Prod'
    const experimentsResponse = await fetch(`https://api.braintrust.dev/v1/experiment?project_id=${project.id}`, {
      headers: {
        'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
      },
    });
    
    if (!experimentsResponse.ok) {
      throw new Error(`Failed to fetch experiments: ${experimentsResponse.statusText}`);
    }
    
    const experiments = await experimentsResponse.json();
    
    // Find the first experiment with 'Prod' tag (only check exp.tags, not metadata.tags)
    const prodExperiment = experiments.objects.find((exp: any) => 
      Array.isArray(exp.tags) && exp.tags.includes('Prod')
    );
    
    if (!prodExperiment) {
      throw new Error('No experiment found with "Prod" tag');
    }

    // Fetch records from the experiment
    const dataResponse = await fetch(`https://api.braintrust.dev/v1/experiment/${prodExperiment.id}/fetch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: []
      }),
    });
    
    if (!dataResponse.ok) {
      throw new Error(`Failed to fetch experiment data: ${dataResponse.statusText}`);
    }
    
    const data = await dataResponse.json();
    
    if (!data.events || data.events.length === 0) {
      throw new Error('No events found in the experiment');
    }
    
    // Find the first root event
    const rootEvent = data.events.find((event: any) => event.is_root === true);
    
    if (!rootEvent) {
      throw new Error('No root event found in the experiment');
    }
    
    // Get the instructions from the root event's metadata
    const instructions = rootEvent.metadata?.instructions;
    
    if (!instructions) {
      throw new Error('No instructions found in the root event metadata');
    }
    
    return instructions;
  } catch (error) {
    console.error('Error fetching champion instructions:', error);
    throw error;
  }
}

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: async ({runtimeContext}) => {
    return runtimeContext.get("instructions") as string ?? defaultInstructions;
  },
  model: wrapAISDKModel(openai('gpt-4o-mini')),
  tools: { weatherTool, weatherActivitiesTool, nearbyCitiesTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
