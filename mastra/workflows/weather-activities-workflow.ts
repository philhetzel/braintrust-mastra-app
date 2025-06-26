import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { tavilySearchTool } from '../tools/tavily-tool';

// Step to generate weather-appropriate search query
const generateSearchQuery = createStep({
  id: 'generate-search-query',
  inputSchema: z.object({
    city: z.string().describe('Name of the city'),
    weather: z.string().describe('Current weather conditions in the city'),
  }),
  outputSchema: z.object({
    query: z.string(),
    location: z.string().optional(),
    max_results: z.number().optional().default(8),
    originalCity: z.string(),
    originalWeather: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { city, weather } = inputData;
    
    // Create a search query that combines weather conditions with activity suggestions
    const weatherLower = weather.toLowerCase();
    let query = '';
    
    if (weatherLower.includes('rain') || weatherLower.includes('storm')) {
      query = `indoor activities things to do rainy day ${city}`;
    } else if (weatherLower.includes('snow') || weatherLower.includes('cold')) {
      query = `winter activities things to do cold weather ${city}`;
    } else if (weatherLower.includes('hot') || weatherLower.includes('sunny') || weatherLower.includes('clear')) {
      query = `outdoor activities summer things to do sunny weather ${city}`;
    } else if (weatherLower.includes('cloudy') || weatherLower.includes('overcast')) {
      query = `things to do activities ${city} any weather`;
    } else {
      query = `things to do activities ${city} ${weather}`;
    }
    
    return { 
      query, 
      location: city, 
      max_results: 8,
      originalCity: city,
      originalWeather: weather
    };
  },
});

// Use the Tavily search tool directly as a step
const tavilyStep = createStep(tavilySearchTool);

// Step to format the final output
const formatOutput = createStep({
  id: 'format-output',
  inputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      content: z.string(),
      score: z.number().optional(),
    })),
    query: z.string(),
    originalCity: z.string(),
    originalWeather: z.string(),
  }),
  outputSchema: z.object({
    city: z.string(),
    weather: z.string(),
    activities: z.array(z.object({
      title: z.string(),
      description: z.string(),
      url: z.string(),
      relevanceScore: z.number().optional(),
    })),
    searchQuery: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { results, query, originalCity, originalWeather } = inputData;
    
    // Transform search results into activity format
    const activities = results.map((result: any) => ({
      title: result.title,
      description: result.content,
      url: result.url,
      relevanceScore: result.score,
    }));
    
    return {
      city: originalCity,
      weather: originalWeather,
      activities,
      searchQuery: query,
    };
  },
});

export const weatherActivitiesWorkflow = createWorkflow({
  id: 'weather-activities-workflow',
  description: 'Find weather-appropriate activities for a city based on current weather conditions',
  inputSchema: z.object({
    city: z.string().describe('Name of the city'),
    weather: z.string().describe('Current weather conditions in the city'),
  }),
  outputSchema: z.object({
    city: z.string(),
    weather: z.string(),
    activities: z.array(z.object({
      title: z.string(),
      description: z.string(),
      url: z.string(),
      relevanceScore: z.number().optional(),
    })),
    searchQuery: z.string(),
  }),
})
  .then(generateSearchQuery)
  .map(({ inputData }) => {
    // Map the output to match the Tavily tool's input schema
    return {
      query: inputData.query,
      location: inputData.location,
      max_results: inputData.max_results,
    };
  })
  .then(tavilyStep)
  .map(({ inputData, getStepResult }) => {
    // Get the original city and weather from the first step
    const firstStepResult = getStepResult(generateSearchQuery);
    // Get the search results from the Tavily step
    const searchResults = inputData;
    
    return {
      results: searchResults.results,
      query: searchResults.query,
      originalCity: firstStepResult.originalCity,
      originalWeather: firstStepResult.originalWeather,
    };
  })
  .then(formatOutput)
  .commit(); 