import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { tavily } from '@tavily/core';

export const tavilySearchTool = createTool({
  id: 'tavily-search',
  description: 'Search the web using Tavily for relevant information and activities',
  inputSchema: z.object({
    query: z.string().describe('Search query to find relevant information'),
    location: z.string().optional().describe('Location to focus the search on'),
    max_results: z.number().optional().default(5).describe('Maximum number of results to return'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      content: z.string(),
      score: z.number().optional(),
    })),
    query: z.string(),
  }),
  execute: async ({ context }) => {
    return await searchTavily(context.query, context.location, context.max_results);
  },
});

const searchTavily = async (query: string, location?: string, maxResults: number = 5) => {
  // Initialize Tavily client with API key from environment
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is required');
  }

  const client = tavily({ apiKey });
  
  // Enhance query with location if provided
  const enhancedQuery = location ? `${query} in ${location}` : query;

  try {
    const response = await client.search(enhancedQuery, {
      searchDepth: 'basic',
      maxResults,
      includeAnswer: false,
      includeImages: false,
      includeRawContent: false,
    });

    return {
      results: response.results.map(result => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
      })),
      query: enhancedQuery,
    };
  } catch (error) {
    throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 