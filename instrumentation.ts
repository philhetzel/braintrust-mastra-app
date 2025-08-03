export async function register() {
  console.log('[Instrumentation] Starting registration, NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Loading OpenTelemetry modules...');
    
    const { NodeSDK } = await import('@mastra/core/telemetry/otel-vendor');
    const { BraintrustSpanProcessor } = await import('braintrust');
    
    console.log('[Instrumentation] Creating BraintrustSpanProcessor...');
    
    const spanProcessor = new BraintrustSpanProcessor({
      apiKey: process.env.BRAINTRUST_API_KEY,
      parent: process.env.BRAINTRUST_PARENT || "project_name:MastraAppTest",
      filterAISpans: true,
    });
    
    const sdk = new NodeSDK({
      serviceName: "my-service",
      spanProcessor,
    });

    sdk.start();
    
    console.log('[Instrumentation] OpenTelemetry SDK started with Braintrust exporter');
  }
}