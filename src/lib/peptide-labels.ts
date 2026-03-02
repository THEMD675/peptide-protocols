import type { ElementType } from 'react';
import { TrendingDown, Heart, Zap, Brain, Clock, Shield } from 'lucide-react';

export const evidenceColors: Record<string, string> = {
  excellent: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  strong: 'bg-blue-100 text-blue-800 border-blue-300',
  good: 'bg-sky-100 text-sky-800 border-sky-300',
  moderate: 'bg-amber-100 text-amber-800 border-amber-300',
  weak: 'bg-orange-100 text-orange-800 border-orange-300',
  'very-weak': 'bg-red-100 text-red-800 border-red-300',
};

export const evidenceLabels: Record<string, string> = {
  excellent: 'ممتاز',
  strong: 'قوي',
  good: 'جيد',
  moderate: 'متوسط',
  weak: 'ضعيف',
  'very-weak': 'ضعيف جدًا',
};

export const evidenceDescriptions: Record<string, string> = {
  excellent: 'ممتاز — تجارب سريرية كبرى + اعتماد FDA',
  strong: 'قوي — تجارب بشرية متعددة',
  good: 'جيد — دراسات بشرية محدودة',
  moderate: 'متوسط — دراسات حيوانية + تقارير بشرية',
  weak: 'ضعيف — دراسات حيوانية فقط',
  'very-weak': 'ضعيف جدًا — بيانات أولية محدودة',
};

export const evidenceOrder: Record<string, number> = { excellent: 0, strong: 1, good: 2, moderate: 3, weak: 4, 'very-weak': 5 };

export const categoryLabels: Record<string, string> = {
  metabolic: 'الأيض',
  recovery: 'التعافي',
  hormonal: 'الهرمونات',
  brain: 'الدماغ',
  longevity: 'إطالة العمر',
  'skin-gut': 'البشرة والأمعاء',
};

export const categoryIcons: Record<string, ElementType> = {
  metabolic: TrendingDown,
  recovery: Heart,
  hormonal: Zap,
  brain: Brain,
  longevity: Clock,
  'skin-gut': Shield,
};
