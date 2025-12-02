import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { env } = getRequestContext();
  const { username, password } = await request.json();

  // 1. Check legacy/simple ADMIN_PASSWORD
  // If the user is 'admin' (or we just care about the password matching the admin pass)
  if (env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
    return Response.json({ success: true });
  }

  // 2. Check AUTH_USERS environment variable
  // Format: "user1:pass1,user2:pass2"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUsers = process.env.AUTH_USERS || (env as any).AUTH_USERS;
  
  if (authUsers) {
    const users = authUsers.split(',').map((u: string) => {
      const [user, pass] = u.split(':');
      return { user: user?.trim(), pass: pass?.trim() };
    });

    const match = users.find((u: { user: string; pass: string }) => u.user === username && u.pass === password);
    if (match) {
      return Response.json({ success: true });
    }
  }

  return new Response('Unauthorized', { status: 401 });
}
