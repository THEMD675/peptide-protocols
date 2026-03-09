import { describe, it, expect } from 'vitest'

/**
 * Tests for Login page pure logic.
 * The actual Login component requires heavy mocking (Supabase, Router, Turnstile, Google).
 * We extract and test the critical pure functions that handle security and UX.
 */

// ── safeRedirect (copied from Login.tsx for isolated testing) ──
function safeRedirect(raw: string | null, fallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback;
}

// ── friendlyError (copied from Login.tsx for isolated testing) ──
const friendlyError = (msg: string) => {
  const hasArabic = /[\u0600-\u06FF]/.test(msg);
  if (hasArabic) return msg;
  if (msg.includes('Invalid login')) return 'البريد أو كلمة المرور غير صحيحة — إذا سجّلت بـ Google جرّب زر Google أعلاه';
  if (msg.includes('Email not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولًا — تحقق من صندوق الوارد والبريد المزعج';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'هذا البريد مسجّل بالفعل — جرّب تسجيل الدخول';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'محاولات كثيرة — انتظر قليلًا وحاول مرة أخرى';
  if (msg.includes('email_address_invalid') || msg.includes('Unable to validate')) return 'البريد الإلكتروني غير صحيح — تأكد من الكتابة';
  if (msg.includes('weak_password') || msg.includes('Password should')) return 'كلمة المرور ضعيفة — استخدم 8 أحرف على الأقل';
  if (msg.includes('signup_disabled')) return 'التسجيل معطّل مؤقتًا — حاول لاحقًا';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) return 'خطأ في الاتصال — تحقق من الإنترنت وحاول مرة أخرى';
  return 'تعذّر إتمام العملية — تحقق من اتصالك وحاول مرة أخرى';
};

describe('safeRedirect — open redirect prevention', () => {
  it('allows valid internal paths', () => {
    expect(safeRedirect('/dashboard')).toBe('/dashboard');
    expect(safeRedirect('/library')).toBe('/library');
    expect(safeRedirect('/peptide/bpc-157')).toBe('/peptide/bpc-157');
    expect(safeRedirect('/pricing')).toBe('/pricing');
  });

  it('allows root path', () => {
    expect(safeRedirect('/')).toBe('/');
  });

  it('allows paths with query strings', () => {
    expect(safeRedirect('/library?search=bpc')).toBe('/library?search=bpc');
  });

  it('allows paths with fragments', () => {
    expect(safeRedirect('/faq#section-2')).toBe('/faq#section-2');
  });

  it('blocks protocol-relative URLs (//) — open redirect vector', () => {
    expect(safeRedirect('//evil.com')).toBe('/dashboard');
    expect(safeRedirect('//evil.com/path')).toBe('/dashboard');
    expect(safeRedirect('///triple')).toBe('/dashboard');
  });

  it('blocks absolute HTTP URLs', () => {
    expect(safeRedirect('https://evil.com')).toBe('/dashboard');
    expect(safeRedirect('http://evil.com/login')).toBe('/dashboard');
  });

  it('blocks javascript: protocol', () => {
    expect(safeRedirect('javascript:alert(1)')).toBe('/dashboard');
  });

  it('blocks data: URI', () => {
    expect(safeRedirect('data:text/html,<h1>xss</h1>')).toBe('/dashboard');
  });

  it('blocks relative paths (no leading /)', () => {
    expect(safeRedirect('evil.com')).toBe('/dashboard');
    expect(safeRedirect('library')).toBe('/dashboard');
  });

  it('returns fallback for null', () => {
    expect(safeRedirect(null)).toBe('/dashboard');
  });

  it('returns fallback for empty string', () => {
    expect(safeRedirect('')).toBe('/dashboard');
  });

  it('returns fallback for undefined cast', () => {
    expect(safeRedirect(undefined as unknown as string)).toBe('/dashboard');
  });

  it('uses custom fallback', () => {
    expect(safeRedirect(null, '/pricing')).toBe('/pricing');
    expect(safeRedirect('//evil.com', '/home')).toBe('/home');
  });
});

describe('friendlyError — error message mapping', () => {
  it('passes through Arabic messages unchanged', () => {
    const arabic = 'البريد أو كلمة المرور غير صحيحة';
    expect(friendlyError(arabic)).toBe(arabic);
  });

  it('maps "Invalid login credentials"', () => {
    const result = friendlyError('Invalid login credentials');
    expect(result).toContain('البريد أو كلمة المرور غير صحيحة');
    expect(result).toContain('Google');
  });

  it('maps "Email not confirmed"', () => {
    const result = friendlyError('Email not confirmed');
    expect(result).toContain('تأكيد بريدك');
    expect(result).toContain('صندوق الوارد');
  });

  it('maps "already registered"', () => {
    expect(friendlyError('User already registered')).toContain('مسجّل بالفعل');
  });

  it('maps "already been registered"', () => {
    expect(friendlyError('This email has already been registered')).toContain('مسجّل بالفعل');
  });

  it('maps "rate limit"', () => {
    expect(friendlyError('rate limit exceeded')).toContain('محاولات كثيرة');
  });

  it('maps "too many"', () => {
    expect(friendlyError('too many requests')).toContain('محاولات كثيرة');
  });

  it('maps "email_address_invalid"', () => {
    expect(friendlyError('email_address_invalid')).toContain('البريد الإلكتروني غير صحيح');
  });

  it('maps "Unable to validate"', () => {
    expect(friendlyError('Unable to validate email address')).toContain('البريد الإلكتروني غير صحيح');
  });

  it('maps "weak_password"', () => {
    expect(friendlyError('weak_password')).toContain('كلمة المرور ضعيفة');
  });

  it('maps "Password should"', () => {
    expect(friendlyError('Password should be at least 8 characters')).toContain('كلمة المرور ضعيفة');
  });

  it('maps "signup_disabled"', () => {
    expect(friendlyError('signup_disabled')).toContain('التسجيل معطّل');
  });

  it('maps network errors', () => {
    expect(friendlyError('network error')).toContain('خطأ في الاتصال');
    expect(friendlyError('Failed to fetch')).toContain('خطأ في الاتصال');
    expect(friendlyError('fetch failed')).toContain('خطأ في الاتصال');
  });

  it('returns generic Arabic error for unknown messages', () => {
    const result = friendlyError('Some unknown English error');
    expect(result).toContain('تعذّر إتمام العملية');
  });

  it('returns generic error for empty string', () => {
    expect(friendlyError('')).toContain('تعذّر إتمام العملية');
  });
});

describe('Email validation patterns', () => {
  // Basic email regex used in HTML5 input type="email"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('accepts valid emails', () => {
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('abdullah@amirisgroup.co')).toBe(true);
    expect(emailRegex.test('test+tag@gmail.com')).toBe(true);
  });

  it('rejects emails without @', () => {
    expect(emailRegex.test('userexample.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(emailRegex.test('user@')).toBe(false);
  });

  it('rejects emails without TLD', () => {
    expect(emailRegex.test('user@example')).toBe(false);
  });

  it('rejects emails with spaces', () => {
    expect(emailRegex.test('user @example.com')).toBe(false);
    expect(emailRegex.test('user@ example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(emailRegex.test('')).toBe(false);
  });
});

describe('Password validation rules', () => {
  // Supabase default: min 6 chars. pptides uses 8+ as best practice.
  const MIN_LENGTH = 8;

  it('accepts 8+ character passwords', () => {
    expect('password1'.length >= MIN_LENGTH).toBe(true);
    expect('MyStr0ng!'.length >= MIN_LENGTH).toBe(true);
    expect('12345678'.length >= MIN_LENGTH).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect('pass'.length >= MIN_LENGTH).toBe(false);
    expect('1234567'.length >= MIN_LENGTH).toBe(false);
    expect(''.length >= MIN_LENGTH).toBe(false);
  });

  it('accepts password with exactly 8 characters', () => {
    expect('abcdefgh'.length >= MIN_LENGTH).toBe(true);
  });
});

describe('Turnstile token handling', () => {
  it('token is null by default', () => {
    const turnstileToken: string | null = null;
    expect(turnstileToken).toBeNull();
  });

  it('token can be set from callback', () => {
    let turnstileToken: string | null = null;
    // Simulate Turnstile callback
    const callback = (token: string) => { turnstileToken = token; };
    callback('0.test-token-abc');
    expect(turnstileToken).toBe('0.test-token-abc');
  });

  it('token can be reset', () => {
    let turnstileToken: string | null = '0.test-token';
    // Simulate expired callback
    const expiredCallback = () => { turnstileToken = null; };
    expiredCallback();
    expect(turnstileToken).toBeNull();
  });
});
