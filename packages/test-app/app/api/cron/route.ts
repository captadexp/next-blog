import { NextResponse } from 'next/server';
import { dbProvider } from '@/lib/db';
import { runCronJob } from '@supergrowthai/next-blog';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    const dbInstance = await dbProvider();
    await runCronJob(dbInstance);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error executing cron job:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
