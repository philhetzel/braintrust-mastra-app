import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';

import { weatherAgent } from './agents/weather-agent';
import { weatherActivitiesWorkflow } from './workflows/weather-activities-workflow';

export const mastra = new Mastra({
  agents: { weatherAgent },
  workflows: { weatherActivitiesWorkflow },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug', // More detailed logging
  })
});
