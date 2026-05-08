import { proxyRequest } from 'h3';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const gatewayBase = (config.gatewayInternalUrl || 'http://localhost:3001').replace(/\/$/, '');

  // This handler lives under `/api/*`, so forward to gateway without the `/api` prefix.
  const targetPath = event.path.replace(/^\/api/, '') || '/';
  const targetUrl = `${gatewayBase}${targetPath}`;

  return proxyRequest(event, targetUrl);
});

