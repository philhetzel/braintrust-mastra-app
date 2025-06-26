import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';

export const nearbyCitiesTool = createTool({
  id: 'get-nearby-cities',
  description: 'Find nearby cities within an hour drive (approximately 60-80km) of a given location',
  inputSchema: z.object({
    location: z.string().describe('Original city name to find nearby cities from'),
  }),
  outputSchema: z.object({
    originalCity: z.string(),
    nearbyCities: z.array(z.object({
      name: z.string(),
      country: z.string().optional(),
      region: z.string().optional(),
      distance: z.number().optional(),
      population: z.number().optional(),
    })),
  }),
  execute: async ({ context }) => {
    return await getNearbyCities(context.location);
  },
});

const getNearbyCities = async (location: string) => {
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      originalCity: z.string(),
      nearbyCities: z.array(z.object({
        name: z.string(),
        country: z.string().optional(),
        region: z.string().optional(),
        distance: z.number().optional(),
        population: z.number().optional(),
      })),
    }),
         prompt: `You are a geography expert. Given the city "${location}", suggest 2 nearby cities that are within about an hour's drive (approximately 60-80km or 40-50 miles).

Requirements:
- Only include real cities that actually exist
- Focus on cities that are genuinely within driving distance
- Include a mix of larger and smaller cities/towns
- Provide approximate distances in kilometers
- Include the region/state/province if known
- Estimate population if you know it (can be approximate)
- Don't include the original city in the list
- Prefer well-known cities that people would actually visit

For the original city, use the most common/standard name for that location.

Example format:
- Name: "Springfield", Region: "Illinois", Distance: 45, Population: 116000
- Name: "Decatur", Region: "Illinois", Distance: 35, Population: 70000

Please provide realistic suggestions based on actual geography.`,
  });

  return result.object;
};

 