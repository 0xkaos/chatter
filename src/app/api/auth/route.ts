import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { env } = getRequestContext();
  let { username, password } = await request.json();
  
  // Sanitize inputs
  username = username?.trim();
  password = password?.trim();

  // 1. Check AUTH_ADMIN environment variable
  // Format: "username:password"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authAdminVar = (env as any).AUTH_ADMIN || process.env.AUTH_ADMIN;

  if (authAdminVar) {
    const parts = authAdminVar.split(':');
    if (parts.length >= 2) {
      const adminUser = parts[0].trim();
      const adminPass = parts.slice(1).join(':').trim();
      
      if (adminUser === username && adminPass === password) {
        return Response.json({ success: true });
      }
    }
  }

  // 2. Check AUTH_USERS environment variable
  // Format: "user1:pass1,user2:pass2"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUsersVar = (env as any).AUTH_USERS || process.env.AUTH_USERS;
  
  if (authUsersVar) {
    // Parse users, handling potential colons in passwords by joining the rest
    const users = authUsersVar.split(',').map((u: string) => {
      const parts = u.split(':');
      if (parts.length < 2) return null;
      const user = parts[0].trim();
      // Join the rest back in case password has colons
      const pass = parts.slice(1).join(':').trim();
      return { user, pass };
    }).filter(Boolean);

    // Find match
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = users.find((u: any) => u.user === username && u.pass === password);
    
    if (match) {
      return Response.json({ success: true });
    }
  } else {
    console.log('AUTH_USERS not found in environment variables');
  }

  return new Response('Unauthorized', { status: 401 });
}
