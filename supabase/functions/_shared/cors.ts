/**
 * Shared CORS configuration for all edge functions.
 */

const PRODUCTION_ORIGINS = ['https://pptides.com']
const LOCALHOST_ORIGINS = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003']

function getAllowedOrigins(): string[] {
  const env = Deno.env.get('ENVIRONMENT')
  if (env === 'production') return PRODUCTION_ORIGINS
  return [...PRODUCTION_ORIGINS, ...LOCALHOST_ORIGINS]
}

export const ALLOWED_ORIGINS = getAllowedOrigins()

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

export function handleCorsPreflightIfOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }
  return null
}

export function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
