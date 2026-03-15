/**
 * Vercel Serverless Function: /api/unsubscribe
 * One-click email unsubscribe handler.
 * Accepts POST with email + HMAC token, updates user_profiles.email_notifications_enabled = false.
 * Also supports GET to render a simple confirmation form.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HMAC_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET || process.env.CRON_SECRET || '';

function verifyToken(email: string, token: string): boolean {
  if (!HMAC_SECRET) return false;
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(email.toLowerCase()).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

const htmlPage = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafaf9; color: #1c1917; }
    .card { max-width: 400px; padding: 40px; text-align: center; background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { font-size: 16px; color: #57534e; line-height: 1.6; }
    a { color: #059669; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body><div class="card">${body}</div></body>
</html>`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { email, token } = req.query as { email?: string; token?: string };
    if (!email || !token) {
      return res.status(400).send(htmlPage('خطأ', '<h1>رابط غير صالح</h1><p>الرابط المستخدم غير صحيح.</p>'));
    }
    return res.status(200).send(htmlPage('إلغاء الاشتراك | pptides', `
      <h1>إلغاء الاشتراك في الرسائل</h1>
      <p>هل تريد إيقاف استقبال رسائل البريد الإلكتروني من pptides؟</p>
      <form method="POST" action="/api/unsubscribe" style="margin-top: 20px;">
        <input type="hidden" name="email" value="${email.replace(/"/g, '&quot;')}" />
        <input type="hidden" name="token" value="${token.replace(/"/g, '&quot;')}" />
        <button type="submit" style="background: #059669; color: white; border: none; padding: 12px 32px; border-radius: 9999px; font-size: 16px; font-weight: 600; cursor: pointer;">
          تأكيد إلغاء الاشتراك
        </button>
      </form>
    `));
  }

  if (req.method !== 'POST') {
    return res.status(405).send(htmlPage('خطأ', '<h1>الطريقة غير مسموحة</h1>'));
  }

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body;
  const email = (body?.email as string)?.trim()?.toLowerCase();
  const token = (body?.token as string)?.trim();

  if (!email || !token) {
    return res.status(400).send(htmlPage('خطأ', '<h1>بيانات ناقصة</h1><p>يرجى استخدام الرابط الموجود في البريد الإلكتروني.</p>'));
  }

  if (!HMAC_SECRET) {
    console.error('unsubscribe: HMAC secret not configured');
    return res.status(500).send(htmlPage('خطأ', '<h1>خطأ في الخادم</h1><p>حاول مرة أخرى لاحقاً.</p>'));
  }

  try {
    if (!verifyToken(email, token)) {
      return res.status(403).send(htmlPage('خطأ', '<h1>رابط غير صالح</h1><p>رمز التحقق غير صحيح — استخدم الرابط الأصلي من البريد.</p>'));
    }
  } catch {
    return res.status(403).send(htmlPage('خطأ', '<h1>رابط غير صالح</h1><p>رمز التحقق غير صحيح.</p>'));
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).send(htmlPage('خطأ', '<h1>خطأ في الخادم</h1>'));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Find the user by email (paginated to search all users)
  let allUsers: Array<{ id: string; email?: string }> = [];
  {
    let page = 1;
    while (true) {
      const { data: { users: pageUsers }, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (listErr) {
        console.error('unsubscribe: listUsers error:', listErr);
        return res.status(500).send(htmlPage('خطأ', '<h1>خطأ في الخادم</h1>'));
      }
      if (!pageUsers || pageUsers.length === 0) break;
      allUsers = allUsers.concat(pageUsers);
      if (pageUsers.length < 1000) break;
      page++;
    }
  }

  const targetUser = allUsers.find(u => u.email?.toLowerCase() === email);
  if (!targetUser) {
    // Return success anyway to avoid email enumeration
    return res.status(200).send(htmlPage('تم إلغاء الاشتراك', '<h1>تم إلغاء الاشتراك</h1><p>لن تصلك رسائل بريد إلكتروني تسويقية بعد الآن.</p><p><a href="https://pptides.com">العودة إلى pptides</a></p>'));
  }

  const { error: updateErr } = await supabase
    .from('user_profiles')
    .update({ email_notifications_enabled: false })
    .eq('user_id', targetUser.id);

  if (updateErr) {
    // If no profile row exists, try upserting
    if (updateErr.code === 'PGRST116' || updateErr.message?.includes('0 rows')) {
      await supabase.from('user_profiles').upsert({
        user_id: targetUser.id,
        email_notifications_enabled: false,
      }, { onConflict: 'user_id' });
    } else {
      console.error('unsubscribe: update error:', updateErr);
      return res.status(500).send(htmlPage('خطأ', '<h1>خطأ في الخادم</h1><p>حاول مرة أخرى لاحقاً.</p>'));
    }
  }

  return res.status(200).send(htmlPage('تم إلغاء الاشتراك', `
    <h1>تم إلغاء الاشتراك</h1>
    <p>لن تصلك رسائل بريد إلكتروني تسويقية من pptides بعد الآن.</p>
    <p style="margin-top: 16px;"><a href="https://pptides.com">العودة إلى pptides</a></p>
  `));
}
