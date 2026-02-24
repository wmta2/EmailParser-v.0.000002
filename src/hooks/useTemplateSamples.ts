import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface TemplateSample {
  id: string;
  template_id: string;
  name: string;
  html_content: string;
  subject: string | null;
  from_email: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function useTemplateSamples(templateId: string | null) {
  const [samples, setSamples] = useState<TemplateSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      fetchSamples();
    }
  }, [templateId]);

  const fetchSamples = async () => {
    if (!templateId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('template_sample_emails')
        .select('*')
        .eq('template_id', templateId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSamples(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch samples');
    } finally {
      setLoading(false);
    }
  };

  const createSample = async (sample: Omit<TemplateSample, 'id' | 'created_at' | 'updated_at'>) => {
    if (!templateId) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('template_sample_emails')
        .insert([{ ...sample, template_id: templateId }])
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchSamples();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sample');
      return null;
    }
  };

  const updateSample = async (id: string, updates: Partial<TemplateSample>) => {
    try {
      const { error: updateError } = await supabase
        .from('template_sample_emails')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchSamples();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sample');
      return false;
    }
  };

  const deleteSample = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('template_sample_emails')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchSamples();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sample');
      return false;
    }
  };

  const setPrimarySample = async (id: string) => {
    try {
      await supabase
        .from('template_sample_emails')
        .update({ is_primary: false })
        .eq('template_id', templateId);

      const { error: updateError } = await supabase
        .from('template_sample_emails')
        .update({ is_primary: true })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchSamples();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary sample');
      return false;
    }
  };

  const getPrimarySample = () => {
    return samples.find(s => s.is_primary) || samples[0] || null;
  };

  return {
    samples,
    loading,
    error,
    createSample,
    updateSample,
    deleteSample,
    setPrimarySample,
    getPrimarySample,
    refetch: fetchSamples
  };
}
