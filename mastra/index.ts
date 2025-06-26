import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

import { weatherAgent } from './agents/weather-agent';
import { tavilySearchTool } from './tools/tavily-tool';
import { weatherActivitiesWorkflow } from './workflows/weather-activities-workflow';

export const mastra = new Mastra({
  agents: { weatherAgent },
  workflows: { weatherActivitiesWorkflow },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug', // More detailed logging
  }),
  telemetry: {
    serviceName: 'MastraAppTest',
    enabled: true,
    sampling: {
      type: 'always_on',
    },
    export: {
      type: 'otlp',
      // Endpoint and headers will be picked up from environment variables
    },
  },
});
