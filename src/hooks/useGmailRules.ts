import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { GmailImportRule } from '../lib/supabase';

export function useGmailRules() {
  const [rules, setRules] = useState<GmailImportRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gmail_import_rules')
      .select('*')
      .order('priority', { ascending: true });
    setRules(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const createRule = async (rule: Omit<GmailImportRule, 'id' | 'created_at' | 'updated_at'>) => {
    setSaving(true);
    const maxPriority = rules.length > 0 ? Math.max(...rules.map(r => r.priority)) + 1 : 0;
    const { error } = await supabase
      .from('gmail_import_rules')
      .insert({ ...rule, priority: rule.priority ?? maxPriority });
    if (!error) await fetchRules();
    setSaving(false);
    return error;
  };

  const updateRule = async (id: string, updates: Partial<GmailImportRule>) => {
    setSaving(true);
    const { error } = await supabase
      .from('gmail_import_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetchRules();
    setSaving(false);
    return error;
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('gmail_import_rules')
      .delete()
      .eq('id', id);
    if (!error) await fetchRules();
    return error;
  };

  const moveRule = async (id: string, direction: 'up' | 'down') => {
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rules.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const current = rules[index];
    const swap = rules[swapIndex];

    await supabase
      .from('gmail_import_rules')
      .update({ priority: swap.priority, updated_at: new Date().toISOString() })
      .eq('id', current.id);

    await supabase
      .from('gmail_import_rules')
      .update({ priority: current.priority, updated_at: new Date().toISOString() })
      .eq('id', swap.id);

    await fetchRules();
  };

  return { rules, loading, saving, createRule, updateRule, deleteRule, moveRule, refetch: fetchRules };
}
