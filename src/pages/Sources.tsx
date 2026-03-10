import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Shield, CheckCircle, Users, Package, AlertTriangle, Mail, Tag, Send, Loader2,
  BookOpen, ExternalLink, Calendar, Search, Filter, BarChart3, FlaskConical,
  FileText, ChevronDown, ChevronUp, X, Microscope, GraduationCap, ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORT_EMAIL, SITE_URL } from '@/lib/constants';
import { peptides } from '@/data/peptides';

/* ─── Types ──────────────────────────────────────────────── */

interface AggregatedCitation {
  pmid: string;
  peptideIds: string[];
  peptideNames: string[];
}

/* ─── Data Aggregation ───────────────────────────────────── */

function buildCitationMap(): AggregatedCitation[] {
  const map = new Map<string, { peptideIds: string[]; peptideNames: string[] }>();

  for (const p of peptides) {
    if (!p.pubmedIds) continue;
    for (const pmid of p.pubmedIds) {
      if (!map.has(pmid)) {
        map.set(pmid, { peptideIds: [], peptideNames: [] });
      }
      const entry = map.get(pmid)!;
      if (!entry.peptideIds.includes(p.id)) {
        entry.peptideIds.push(p.id);
        entry.peptideNames.push(p.nameAr);
      }
    }
  }

  return Array.from(map.entries()).map(([pmid, data]) => ({
    pmid,
    ...data,
  }));
}

const allCitations = buildCitationMap();

/* ─── Sourcing Interest Form (preserved) ─────────────────── */

function SourcingInterestForm() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [selectedPeptides, setSelectedPeptides] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const popularPeptides = peptides.filter(p =>
    ['bpc-157', 'tb-500', 'semaglutide', 'tirzepatide', 'retatrutide', 'cjc-1295', 'ipamorelin', 'semax', 'epithalon'].includes(p.id)
  );

  const togglePeptide = (id: string) => {
    setSelectedPeptides(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('يرجى إدخال بريدك الإلكتروني'); return; }
    if (selectedPeptides.length === 0) { toast.error('اختر ببتيد واحد على الأقل'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('enquiries').insert({
        user_id: user?.id ?? null,
        email: email.trim(),
        subject: 'sourcing_interest',
        peptide_name: selectedPeptides.join(', '),
        message: `رقم التواصل: ${phone || 'لم يُذكر'}\n\nالببتيدات المطلوبة: ${selectedPeptides.join(', ')}\n\nملاحظات: ${notes || 'لا يوجد'}`,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('تم تسجيل اهتمامك — سنتواصل معك قريبًا');
    } catch {
      toast.error('تعذّر إرسال الطلب — حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="mt-10 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-700" />
        <p className="text-lg font-bold text-stone-900">تم تسجيل اهتمامك</p>
        <p className="mt-2 text-sm text-stone-600">سنتواصل معك عند توفّر خدمة التوريد الموثوق</p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 md:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Package className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">تبحث عن مورّد موثوق؟</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">نعمل على توفير خدمة توريد ببتيدات موثوقة للمنطقة العربية. سجّل اهتمامك وسنتواصل معك عند الإطلاق.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="src-email" className="mb-1 block text-sm font-medium text-stone-800 dark:text-stone-200">البريد الإلكتروني *</label>
            <input id="src-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
          </div>
          <div>
            <label htmlFor="src-phone" className="mb-1 block text-sm font-medium text-stone-800 dark:text-stone-200">رقم التواصل (واتساب)</label>
            <input id="src-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" dir="ltr"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-stone-800 dark:text-stone-200">ما الببتيدات التي تبحث عنها؟ *</p>
          <div className="flex flex-wrap gap-2">
            {popularPeptides.map(p => (
              <button key={p.id} type="button" onClick={() => togglePeptide(p.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[44px] inline-flex items-center',
                  selectedPeptides.includes(p.id)
                    ? 'border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600',
                )}
              >
                {p.nameAr}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="src-notes" className="mb-1 block text-sm font-medium text-stone-800 dark:text-stone-200">ملاحظات إضافية</label>
          <textarea id="src-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="الكمية المطلوبة، الهدف، أي تفاصيل إضافية..."
            className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 resize-none" />
        </div>

        <button type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'جارٍ الإرسال...' : 'سجّل اهتمامك'}
        </button>

        <p className="text-center text-xs text-stone-500 dark:text-stone-500">pptides لا تبيع ببتيدات حاليًا — نجمع الاهتمام لتوفير خدمة موثوقة مستقبلًا</p>
      </form>
    </section>
  );
}

/* ─── Sourcing Criteria ──────────────────────────────────── */

const criteria = [
  {
    icon: Shield,
    titleAr: 'شهادة تحليل طرف ثالث',
    titleEn: 'Third-party COA',
    descriptionAr:
      'يجب أن يوفّر المورد شهادة تحليل (Certificate of Analysis) من مختبر مستقل لكل دفعة، تؤكد الهوية والنقاء والتعقيم.',
  },
  {
    icon: CheckCircle,
    titleAr: 'نقاء HPLC ≥ 98%',
    titleEn: 'HPLC purity ≥ 98%',
    descriptionAr:
      'النقاء المرتفع يعني شوائب أقل وفعالية أعلى. ابحث عن نتائج HPLC و Mass Spec في شهادة التحليل.',
  },
  {
    icon: Package,
    titleAr: 'تخزين وشحن مبرّد',
    titleEn: 'Cold storage & shipping',
    descriptionAr:
      'الببتيدات حساسة للحرارة. المورد الجيد يخزّن ويشحن بتغليف مبرّد (ice packs) ويوفر تتبعًا للشحنة.',
  },
  {
    icon: Tag,
    titleAr: 'توسيم واضح',
    titleEn: 'Clear labeling',
    descriptionAr:
      'التوسيم الصحيح يتضمن اسم الببتيد، رقم الدفعة، تاريخ الانتهاء، والتركيز. تجنّب المنتجات غير المُوسَّمة.',
  },
  {
    icon: Users,
    titleAr: 'سمعة في مجتمعات البيوهاكينغ',
    titleEn: 'Community reputation',
    descriptionAr:
      'تحقق من التقييمات في منتديات Reddit و Discord ومجتمعات البيوهاكينغ المعروفة. التجارب الحقيقية أهم من الإعلانات.',
  },
];

/* ─── Research Stats Component ───────────────────────────── */

function ResearchStats() {
  const totalCitations = allCitations.length;
  const totalPeptides = peptides.filter(p => p.pubmedIds && p.pubmedIds.length > 0).length;

  // Count unique categories
  const categoriesUsed = new Set(peptides.filter(p => p.pubmedIds?.length).map(p => p.category)).size;

  const stats = [
    { icon: FileText, value: `${totalCitations}+`, label: 'مرجع علمي', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: FlaskConical, value: totalPeptides.toString(), label: 'ببتيد مُوثَّق', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: BookOpen, value: 'PubMed', label: 'قاعدة البيانات', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: BarChart3, value: categoriesUsed.toString(), label: 'فئات علاجية', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ icon: Icon, value, label, color, bg }) => (
        <div
          key={label}
          className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 text-center transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
        >
          <div className={cn('mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl', bg)}>
            <Icon className={cn('h-5 w-5', color)} />
          </div>
          <p className={cn('text-2xl font-bold', color)}>{value}</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Citation Browser Component ─────────────────────────── */

function CitationBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeptideFilter, setSelectedPeptideFilter] = useState<string>('all');
  const [expandedPmid, setExpandedPmid] = useState<string | null>(null);
  const [showAllCitations, setShowAllCitations] = useState(false);
  const [sortOrder, setSortOrder] = useState<'default' | 'peptides'>('default');

  // Build peptide filter options (only peptides with citations)
  const peptideOptions = useMemo(() => {
    return peptides
      .filter(p => p.pubmedIds && p.pubmedIds.length > 0)
      .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
  }, []);

  // Filter and sort citations
  const filteredCitations = useMemo(() => {
    let results = allCitations;

    // Filter by peptide
    if (selectedPeptideFilter !== 'all') {
      results = results.filter(c => c.peptideIds.includes(selectedPeptideFilter));
    }

    // Filter by search query (PMID)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter(c =>
        c.pmid.includes(q) ||
        c.peptideNames.some(n => n.includes(q))
      );
    }

    // Sort
    if (sortOrder === 'peptides') {
      results = [...results].sort((a, b) => b.peptideIds.length - a.peptideIds.length);
    }

    return results;
  }, [searchQuery, selectedPeptideFilter, sortOrder]);

  const displayedCitations = showAllCitations ? filteredCitations : filteredCitations.slice(0, 20);

  return (
    <section className="mb-10" aria-labelledby="citation-browser-heading">
      <div className="mb-6 flex items-center gap-3">
        <Microscope className="h-6 w-6 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <h2 id="citation-browser-heading" className="text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">
          مستعرض المراجع العلمية
        </h2>
        <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {allCitations.length} مرجع
        </span>
      </div>

      {/* Search & Filter Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="ابحث بـ PubMed ID أو اسم الببتيد..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 py-3 pr-10 pl-4 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Peptide Filter */}
        <div className="relative">
          <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <select
            value={selectedPeptideFilter}
            onChange={e => setSelectedPeptideFilter(e.target.value)}
            className="appearance-none rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 py-3 pr-10 pl-8 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 min-w-[180px]"
          >
            <option value="all">كل الببتيدات</option>
            {peptideOptions.map(p => (
              <option key={p.id} value={p.id}>
                {p.nameAr} ({p.pubmedIds?.length || 0})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 pointer-events-none" />
        </div>

        {/* Sort Toggle */}
        <button
          onClick={() => setSortOrder(s => s === 'default' ? 'peptides' : 'default')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all min-h-[44px]',
            sortOrder === 'peptides'
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-emerald-200'
          )}
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortOrder === 'peptides' ? 'الأكثر ارتباطًا' : 'ترتيب افتراضي'}
        </button>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        {filteredCitations.length === allCitations.length
          ? `عرض ${displayedCitations.length} من ${allCitations.length} مرجع`
          : `${filteredCitations.length} نتيجة`}
      </p>

      {/* Citation List */}
      <div className="space-y-2">
        {displayedCitations.map((citation) => {
          const isExpanded = expandedPmid === citation.pmid;

          return (
            <div
              key={citation.pmid}
              className={cn(
                'rounded-xl border transition-all',
                isExpanded
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-emerald-200 dark:hover:border-emerald-800'
              )}
            >
              {/* Main row */}
              <div className="flex items-center gap-3 p-4">
                {/* PubMed badge */}
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-800"
                  title={`فتح PubMed ${citation.pmid}`}
                >
                  <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                </a>

                {/* Citation info */}
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2"
                  >
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400" dir="ltr">
                      PMID: {citation.pmid}
                    </span>
                    <ExternalLink className="h-3 w-3 text-emerald-700 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {citation.peptideNames.map((name, i) => (
                      <span
                        key={citation.peptideIds[i]}
                        className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-400"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Peptide count badge */}
                {citation.peptideIds.length > 1 && (
                  <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-bold text-blue-700 dark:text-blue-400">
                    {citation.peptideIds.length} ببتيدات
                  </span>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedPmid(isExpanded ? null : citation.pmid)}
                  className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 transition-colors"
                  aria-label={isExpanded ? 'إغلاق التفاصيل' : 'عرض التفاصيل'}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-stone-200 dark:border-stone-700 px-4 pb-4 pt-3">
                  <p className="mb-3 text-sm font-medium text-stone-700 dark:text-stone-300">الببتيدات المرتبطة بهذا المرجع:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {citation.peptideIds.map((pid, i) => {
                      const p = peptides.find(pp => pp.id === pid);
                      return (
                        <Link
                          key={pid}
                          to={`/peptide/${pid}`}
                          className="flex items-center gap-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        >
                          <FlaskConical className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                          <div>
                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{citation.peptideNames[i]}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400" dir="ltr">{p?.nameEn}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-center">
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      <ExternalLink className="h-3 w-3" />
                      فتح في PubMed
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {filteredCitations.length > 20 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAllCitations(!showAllCitations)}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-6 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-400 transition-all hover:border-emerald-300 hover:text-emerald-700 min-h-[44px]"
          >
            {showAllCitations ? (
              <>
                <ChevronUp className="h-4 w-4" />
                عرض أقل
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                عرض الكل ({filteredCitations.length})
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

/* ─── Peptide-Citation Map Component ─────────────────────── */

function PeptideCitationMap() {
  const [expandedPeptide, setExpandedPeptide] = useState<string | null>(null);

  const peptidesWithCitations = useMemo(() => {
    return peptides
      .filter(p => p.pubmedIds && p.pubmedIds.length > 0)
      .sort((a, b) => (b.pubmedIds?.length || 0) - (a.pubmedIds?.length || 0));
  }, []);

  return (
    <section className="mb-10" aria-labelledby="peptide-map-heading">
      <div className="mb-6 flex items-center gap-3">
        <FlaskConical className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
        <h2 id="peptide-map-heading" className="text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">
          خريطة الببتيدات والمراجع
        </h2>
      </div>
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
        اضغط على أي ببتيد لعرض مراجعه العلمية في PubMed
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {peptidesWithCitations.map(p => {
          const isExpanded = expandedPeptide === p.id;
          const count = p.pubmedIds?.length || 0;

          return (
            <div key={p.id} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 transition-all hover:border-emerald-200 dark:hover:border-emerald-800">
              <button
                onClick={() => setExpandedPeptide(isExpanded ? null : p.id)}
                className="flex w-full items-center gap-3 p-3 text-right"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400" dir="ltr">{p.nameEn}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {count}
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />}
              </button>

              {isExpanded && p.pubmedIds && (
                <div className="border-t border-stone-200 dark:border-stone-700 p-3 space-y-1.5">
                  {p.pubmedIds.map(pmid => (
                    <a
                      key={pmid}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-stone-800 px-3 py-2 text-xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium text-stone-700 dark:text-stone-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400" dir="ltr">
                        PMID: {pmid}
                      </span>
                      <ExternalLink className="h-3 w-3 text-stone-400 mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Methodology Section ────────────────────────────────── */

function MethodologySection() {
  const steps = [
    {
      icon: Search,
      title: 'البحث المنهجي',
      description: 'نبحث في قواعد بيانات PubMed و Google Scholar عن كل ببتيد، مع التركيز على التجارب السريرية والمراجعات المنهجية والتحليلات التجميعية.',
    },
    {
      icon: Filter,
      title: 'معايير الاختيار',
      description: 'نختار الدراسات المنشورة في مجلات محكّمة ذات عامل تأثير مرتفع. نُعطي الأولوية للتجارب السريرية على البشر، ثم الدراسات قبل السريرية عند عدم توفر بيانات بشرية.',
    },
    {
      icon: GraduationCap,
      title: 'المراجعة والتحقق',
      description: 'يراجع فريقنا كل مرجع للتحقق من صحة الاستشهاد وملاءمته للمعلومة المذكورة. نُحدّث المراجع دوريًا مع صدور أبحاث جديدة.',
    },
    {
      icon: Shield,
      title: 'الالتزام بالدقة',
      description: 'نلتزم بالشفافية الكاملة — كل معلومة طبية على pptides مدعومة بمرجع علمي يمكنك التحقق منه بنفسك عبر PubMed.',
    },
  ];

  return (
    <section className="mb-10" aria-labelledby="methodology-heading">
      <div className="mb-6 flex items-center gap-3">
        <GraduationCap className="h-6 w-6 shrink-0 text-purple-600 dark:text-purple-400" />
        <h2 id="methodology-heading" className="text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">
          كيف نبحث ونوثّق
        </h2>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {steps.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/30">
                <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
          <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
            <strong>ملاحظة:</strong> جميع أرقام PubMed (PMID) المذكورة هي معرّفات حقيقية يمكنك البحث عنها مباشرة في{' '}
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline hover:text-emerald-700"
            >
              pubmed.ncbi.nlm.nih.gov
            </a>
            . نؤمن بأن المعرفة الصحية يجب أن تكون شفافة وقابلة للتحقق.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Sources Page ──────────────────────────────────── */

export default function Sources() {
  return (
    <div className="min-h-screen animate-fade-in" role="main" aria-label="المصادر العلمية">
      <Helmet>
        <title>المصادر العلمية | pptides — {allCitations.length}+ مرجع من PubMed</title>
        <meta
          name="description"
          content={`مكتبة بحثية تضم ${allCitations.length}+ مرجع علمي من PubMed تغطي ${peptides.length} ببتيد. ابحث، صفّي، واستكشف الأدلة العلمية وراء كل بروتوكول.`}
        />
        <meta property="og:title" content={`المصادر العلمية | pptides — ${allCitations.length}+ مرجع من PubMed`} />
        <meta property="og:description" content={`مكتبة بحثية شاملة تضم ${allCitations.length}+ مرجع علمي تغطي ${peptides.length} ببتيد — معايير التوريد والمراجع العلمية`} />
        <meta property="og:url" content={`${SITE_URL}/sources`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`المصادر العلمية للببتيدات | pptides — ${allCitations.length}+ مرجع`} />
        <meta name="twitter:description" content={`مكتبة بحثية شاملة تضم ${allCitations.length}+ مرجع علمي من PubMed تغطي ${peptides.length} ببتيد`} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/sources`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'المصادر العلمية للببتيدات',
          headline: `${allCitations.length}+ مرجع علمي من PubMed`,
          url: `${SITE_URL}/sources`,
          description: `مكتبة بحثية شاملة تضم ${allCitations.length}+ مرجع علمي تغطي ${peptides.length} ببتيد`,
          inLanguage: 'ar',
          publisher: { '@type': 'Organization', name: 'pptides', url: SITE_URL },
          about: { '@type': 'Thing', name: 'Peptide Research References' },
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-5xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <BookOpen className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            المصادر{' '}
            <span className="text-emerald-700 dark:text-emerald-400">العلمية</span>
          </h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            كل معلومة على pptides مدعومة بأبحاث محكّمة من PubMed — استكشف {allCitations.length}+ مرجع علمي يغطي {peptides.filter(p => p.pubmedIds?.length).length} ببتيد
          </p>
        </div>

        {/* Research Stats */}
        <div className="mb-10">
          <ResearchStats />
        </div>

        {/* How We Research */}
        <MethodologySection />

        {/* Citation Browser */}
        <CitationBrowser />

        {/* Peptide-Citation Map */}
        <PeptideCitationMap />

        {/* Section: Sourcing Criteria */}
        <section className="mb-10">
          <div className="mb-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4">
            <p className="text-sm text-stone-700 dark:text-stone-300">
              <strong className="text-stone-900 dark:text-stone-100">تنويه:</strong> pptides منصة تعليمية — لا نبيع ببتيدات ولا نتحمل مسؤولية أي عملية شراء. المعايير أدناه لمساعدتك في اختيار مورد موثوق.
            </p>
          </div>
          <h2 className="mb-6 text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl">
            كيف تختار مورد ببتيدات موثوق؟
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {criteria.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.titleEn}
                  className={cn(
                    'group rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-5 transition-all',
                    'hover:border-emerald-300 hover:bg-white dark:hover:bg-stone-800'
                  )}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                    <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-stone-900 dark:text-stone-100">{item.titleAr}</h3>
                  <span className="mb-2 block text-xs text-stone-700 dark:text-stone-400">{item.titleEn}</span>
                  <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-300">{item.descriptionAr}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mb-10">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] dark:bg-amber-900/10 p-6">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400">ملاحظة مهمة</h2>
            </div>
            <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-300">
              هذه القائمة لأغراض تعليمية فقط. لا نبيع ببتيدات ولا نتحمل مسؤولية أي عملية شراء.
              تحقق من القوانين المحلية في بلدك قبل الشراء.
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <section>
          <div className="rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
              <Mail className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-stone-900 dark:text-stone-100">
              هل تعرف موردًا موثوقًا؟
            </h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-stone-800 dark:text-stone-300">
              إذا كنت تعرف موردًا يستوفي هذه المعايير، أرسل لنا على
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition-opacity hover:opacity-80"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        {/* Peptide Sourcing Interest Form */}
        <SourcingInterestForm />

        <div className="mt-10 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
          <p className="font-bold text-stone-900 dark:text-stone-100">جاهز تختار بروتوكولك؟</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">تصفّح مكتبة الببتيدات واحسب جرعتك</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/library" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 min-h-[44px] inline-flex items-center justify-center">تصفّح المكتبة</Link>
            <Link to="/calculator" className="rounded-full border border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30 min-h-[44px] inline-flex items-center justify-center">حاسبة الجرعات</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
