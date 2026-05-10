'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import type { Category } from '@finanzapp/types';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

type Rule = { id: string; categoryId: string; pattern: string; field: string; priority: number };

function CategoryCard({ cat }: { cat: Category }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState('');
  const [field, setField] = useState('purpose');
  const [priority, setPriority] = useState(0);

  const FIELD_LABELS: Record<string, string> = {
    purpose: t('categories.purpose'),
    creditorName: t('categories.creditorName'),
    merchantName: t('categories.merchantName'),
  };

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ['category-rules', cat.id],
    queryFn: () => api.get(`/categories/${cat.id}/rules`),
    enabled: open,
  });

  const addRule = useMutation({
    mutationFn: () => api.post(`/categories/${cat.id}/rules`, { pattern, field, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category-rules', cat.id] });
      qc.invalidateQueries({ queryKey: ['spending-breakdown'] });
      setPattern('');
      setPriority(0);
    },
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => api.delete(`/categories/${cat.id}/rules/${ruleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category-rules', cat.id] });
      qc.invalidateQueries({ queryKey: ['spending-breakdown'] });
    },
  });

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: cat.color ? `${cat.color}18` : '#f1f5f9' }}
        >
          {cat.icon ?? '📁'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">
            {cat.isSystem ? t(`categories.names.${cat.id}`, { defaultValue: cat.name }) : cat.name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {cat.isSystem ? t('categories.system') : t('categories.custom')}
          </p>
        </div>
        {open
          ? <ChevronDown size={15} className="text-slate-400 shrink-0" />
          : <ChevronRight size={15} className="text-slate-400 shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
          {isLoading ? (
            <p className="text-xs text-slate-400">{t('categories.loading')}</p>
          ) : (
            <>
              {rules.length === 0 && (
                <p className="text-xs text-slate-400">{t('categories.noRules')}</p>
              )}
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 rounded-lg px-3 py-2 ring-1 ring-slate-100 dark:ring-slate-700">
                    <span className="badge-violet shrink-0">{FIELD_LABELS[rule.field] ?? rule.field}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 flex-1 truncate text-xs">"{rule.pattern}"</span>
                    {rule.priority !== 0 && <span className="text-[11px] text-slate-400 shrink-0">P{rule.priority}</span>}
                    <button
                      onClick={() => deleteRule.mutate(rule.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 ml-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">{t('categories.newRule')}</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder={t('categories.patternPlaceholder')}
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    className="input flex-1 min-w-40 py-2 text-xs"
                  />
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    className="input w-auto py-2 text-xs"
                  >
                    {Object.entries(FIELD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder={t('categories.priority')}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="input w-20 py-2 text-xs"
                  />
                  <button
                    onClick={() => pattern.trim() && addRule.mutate()}
                    disabled={!pattern.trim() || addRule.isPending}
                    className="btn-primary py-2 text-xs px-3"
                  >
                    <Plus size={13} />
                    {t('categories.add')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function KategorienPage() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const systemCats = categories.filter((c) => c.isSystem && !c.parentId);
  const userCats = categories.filter((c) => !c.isSystem);

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-7">
        <h1 className="page-title">{t('categories.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('categories.description')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">{t('categories.loading')}</p>
      ) : (
        <>
          {userCats.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {t('categories.customCategories')}
              </h2>
              <div className="space-y-2">
                {userCats.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t('categories.systemCategories')}
            </h2>
            <div className="space-y-2">
              {systemCats.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
