import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { env } = getRequestContext();
  const { password } = await request.json();

  // Check against environment variable
  if (password === env.ADMIN_PASSWORD) {
    return Response.json({ success: true });
  }

  return new Response('Unauthorized', { status: 401 });
}
