import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { wrapTraced } from 'braintrust';

export const weatherActivitiesTool = createTool({
  id: 'get-weather-activities',
  description: 'Find weather-appropriate activities for a city based on current weather conditions',
  inputSchema: z.object({
    city: z.string().describe('Name of the city'),
    weather: z.string().describe('Current weather conditions'),
  }),
  outputSchema: z.object({
    activities: z.array(z.object({
      title: z.string(),
      description: z.string(),
      url: z.string(),
      relevanceScore: z.number().optional(),
    })),
    searchQuery: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    return await getWeatherActivities(context.city, context.weather, mastra);
  },
});

const getWeatherActivities = wrapTraced(async (city: string, weather: string, mastra: any) => {
  if (!mastra) {
    throw new Error('Mastra instance is required to access workflows');
  }

  const workflow = mastra.getWorkflow('weatherActivitiesWorkflow');
  if (!workflow) {
    throw new Error('Weather activities workflow not found');
  }

  const run = workflow.createRun();
  
  const result = await run.start({
    inputData: {
      city,
      weather,
    }
  });

  if (result.status === 'success') {
    return {
      activities: result.result.activities,
      searchQuery: result.result.searchQuery,
    };
  } else {
    throw new Error(`Workflow execution failed with status: ${result.status}`);
  }
}, { name: "getWeatherActivities", type: "tool" }); 