import { registerOTel } from "@vercel/otel";

registerOTel({
  serviceName: 'MastraAppTest'
});