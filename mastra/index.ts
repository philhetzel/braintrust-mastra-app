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
      endpoint: 'https://api.braintrust.dev/v1/otel/traces',
      headers: {
        'Authorization': `Bearer ${process.env.BRAINTRUST_API_KEY}`,
        'x-bt-parent': 'project_id:fdb997ff-4a7a-419c-942e-ce58070fc5c4'
      }
      // Alternative: For Vercel's built-in observability, use:
      // endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      // headers: {} // Vercel handles auth automatically
    },
  },
});
