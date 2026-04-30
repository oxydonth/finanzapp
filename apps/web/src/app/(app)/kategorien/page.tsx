'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Category } from '@finanzapp/types';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

type Rule = { id: string; categoryId: string; pattern: string; field: string; priority: number };

const FIELD_LABELS: Record<string, string> = {
  purpose: 'Verwendungszweck',
  creditorName: 'Gläubigername',
  merchantName: 'Händlername',
};

function CategoryCard({ cat }: { cat: Category }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState('');
  const [field, setField] = useState('purpose');
  const [priority, setPriority] = useState(0);

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: cat.color ? `${cat.color}22` : '#f3f4f6' }}
        >
          {cat.icon ?? '📁'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{cat.name}</p>
          <p className="text-xs text-gray-400">{cat.isSystem ? 'System' : 'Eigene'}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {isLoading ? (
            <p className="text-sm text-gray-400">Lädt…</p>
          ) : (
            <>
              {rules.length === 0 && (
                <p className="text-sm text-gray-400">Keine Regeln. Füge eine Regel hinzu um Transaktionen automatisch zu kategorisieren.</p>
              )}
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">{FIELD_LABELS[rule.field] ?? rule.field}</span>
                    <span className="font-mono text-gray-700 flex-1 truncate">"{rule.pattern}"</span>
                    {rule.priority !== 0 && <span className="text-xs text-gray-400">P{rule.priority}</span>}
                    <button
                      onClick={() => deleteRule.mutate(rule.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Neue Regel</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Muster (z.B. REWE)"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    className="flex-1 min-w-40 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {Object.entries(FIELD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Priorität"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={() => pattern.trim() && addRule.mutate()}
                    disabled={!pattern.trim() || addRule.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Hinzufügen
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
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const systemCats = categories.filter((c) => c.isSystem && !c.parentId);
  const userCats = categories.filter((c) => !c.isSystem);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kategorien</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definiere Regeln um Transaktionen automatisch zuzuordnen. Muster werden als reguläre Ausdrücke behandelt.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Lädt…</p>
      ) : (
        <>
          {userCats.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Eigene Kategorien</h2>
              <div className="space-y-2">
                {userCats.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Systemkategorien</h2>
            <div className="space-y-2">
              {systemCats.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
