export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    import('@vercel/otel').then(({ registerOTel }) => {
      import('braintrust').then(({ BraintrustExporter }) => {
        registerOTel({
          serviceName: 'MastraAppTest',
          traceExporter: new BraintrustExporter({
            parent: "project_name:MastraAppTest",
            filterAISpans: true, // Only send AI-related spans
          }),
        });
      });
    });
  }
}