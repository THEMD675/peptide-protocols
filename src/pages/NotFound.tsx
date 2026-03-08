import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in" dir="rtl">
      <Helmet>
        <title>404 | pptides</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Link to="/" className="mb-6 text-2xl font-bold tracking-tight text-stone-900 hover:opacity-90 transition-opacity" dir="ltr">
        pp<span className="text-emerald-600">tides</span>
      </Link>
      <h1 className="mb-4 text-5xl font-bold text-stone-900">404</h1>
      <p className="mb-8 text-lg text-stone-800">الصفحة غير موجودة</p>
      <Link
        to="/"
        className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white transition-colors hover:bg-emerald-700"
      >
        الرئيسية
      </Link>
    </div>
  );
}
