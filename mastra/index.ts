import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

import { weatherAgent } from './agents/weather-agent';
import { tavilySearchTool } from './tools/tavily-tool';
import { weatherActivitiesWorkflow } from './workflows/weather-activities-workflow';

export const mastra = new Mastra({
  agents: { weatherAgent },
  workflows: { weatherActivitiesWorkflow },
  storage: new LibSQLStore({
    // Change to file-based storage to persist telemetry and tool call data
    url: 'file:../mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug', // More detailed logging
  }),
});
