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

export const onRequestError = async (
  err: { digest: string } & Error,
  _request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  _context: {
    renderSource: 'react-server-components' | 'react-server-components-payload' | 'server-side-rendering';
  }
) => {
  console.error(`Request error: ${err.message}`);
};