import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";
import dotenv from 'dotenv';
dotenv.config();

registerOTel({
  serviceName: 'MastraAppTest',
  traceExporter: new OTLPHttpJsonTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {
      'Authorization': `Bearer ${process.env.BRAINTRUST_API_KEY}`,
      'x-bt-parent': 'project_id:fdb997ff-4a7a-419c-942e-ce58070fc5c4',
    },
  }),
});