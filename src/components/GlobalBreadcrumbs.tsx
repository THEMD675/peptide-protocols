import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://pptides.com';

const ROUTE_LABELS: Record<string, string> = {
  '/library': 'المكتبة',
  '/pricing': 'الأسعار',
  '/calculator': 'حاسبة الجرعات',
  '/guide': 'دليل الحقن',
  '/lab-guide': 'دليل التحاليل',
  '/stacks': 'البروتوكولات المُجمَّعة',
  '/sources': 'المصادر',
  '/faq': 'الأسئلة الشائعة',
  '/about': 'عن pptides',
  '/contact': 'تواصل معنا',
  '/glossary': 'المصطلحات',
  '/community': 'المجتمع',
  '/blog': 'المدونة',
  '/table': 'جدول الببتيدات',
  '/compare': 'مقارنة الببتيدات',
  '/interactions': 'فحص التعارضات',
  '/quiz': 'اختبار الببتيدات',
  '/transparency': 'كيف نكسب المال',
  '/privacy': 'سياسة الخصوصية',
  '/terms': 'شروط الاستخدام',
  '/reviews': 'التقييمات',
};

export default function GlobalBreadcrumbs() {
  const { pathname } = useLocation();
  const label = ROUTE_LABELS[pathname];
  if (!label || pathname === '/') return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: label, item: `${SITE_URL}${pathname}` },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
