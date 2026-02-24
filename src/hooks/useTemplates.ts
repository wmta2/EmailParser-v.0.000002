import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { clearTemplateCache, type EmailTemplatePattern } from '../lib/templateEngine';
import { dynamicParseEmail } from '../lib/templateEngine';
import type { RawEmail } from '../lib/supabase';
import type { ParsedOrderData } from '../lib/emailParser';

export function useTemplates() {
  const [templates, setTemplates] = useState<EmailTemplatePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates(filter?: { active?: boolean; search?: string; platform?: string | null }) {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('email_template_patterns')
        .select('*')
        .order('priority', { ascending: false });

      if (filter?.active !== undefined) {
        query = query.eq('active', filter.active);
      }

      if (filter?.platform !== undefined) {
        if (filter.platform === null) {
          query = query.is('platform', null);
        } else {
          query = query.eq('platform', filter.platform);
        }
      }

      if (filter?.search) {
        query = query.or(`template_name.ilike.%${filter.search}%,provider_name.ilike.%${filter.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTemplates(data as EmailTemplatePattern[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplateById(id: string): Promise<EmailTemplatePattern | null> {
    try {
      const { data, error: fetchError } = await supabase
        .from('email_template_patterns')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      return data as EmailTemplatePattern | null;
    } catch (err) {
      console.error('Error fetching template:', err);
      return null;
    }
  }

  async function createTemplate(template: Omit<EmailTemplatePattern, 'id'>): Promise<{ success: boolean; message: string; data?: EmailTemplatePattern }> {
    try {
      const { data, error: createError } = await supabase
        .from('email_template_patterns')
        .insert(template)
        .select()
        .single();

      if (createError) throw createError;

      clearTemplateCache();
      await fetchTemplates();

      return {
        success: true,
        message: 'Template created successfully',
        data: data as EmailTemplatePattern
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create template'
      };
    }
  }

  async function updateTemplate(id: string, updates: Partial<EmailTemplatePattern>): Promise<{ success: boolean; message: string }> {
    try {
      const { id: _, ...updateData } = updates as any;

      const { error: updateError } = await supabase
        .from('email_template_patterns')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      clearTemplateCache();
      await fetchTemplates();

      return {
        success: true,
        message: 'Template updated successfully'
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to update template'
      };
    }
  }

  async function deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error: deleteError } = await supabase
        .from('email_template_patterns')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      clearTemplateCache();
      await fetchTemplates();

      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to delete template'
      };
    }
  }

  async function toggleTemplateActive(id: string, active: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const { error: updateError } = await supabase
        .from('email_template_patterns')
        .update({ active })
        .eq('id', id);

      if (updateError) throw updateError;

      clearTemplateCache();
      await fetchTemplates();

      return {
        success: true,
        message: `Template ${active ? 'activated' : 'deactivated'} successfully`
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to update template status'
      };
    }
  }

  async function updateTemplatePriority(id: string, priority: number): Promise<{ success: boolean; message: string }> {
    try {
      const { error: updateError } = await supabase
        .from('email_template_patterns')
        .update({ priority })
        .eq('id', id);

      if (updateError) throw updateError;

      clearTemplateCache();
      await fetchTemplates();

      return {
        success: true,
        message: 'Template priority updated successfully'
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to update template priority'
      };
    }
  }

  async function testTemplateAgainstEmail(
    templateType: string,
    email: RawEmail
  ): Promise<{ success: boolean; message: string; data?: ParsedOrderData }> {
    try {
      const parsedData = await dynamicParseEmail(email, templateType);

      if (!parsedData) {
        return {
          success: false,
          message: 'Failed to parse email with this template'
        };
      }

      return {
        success: true,
        message: 'Email parsed successfully',
        data: parsedData
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to test template'
      };
    }
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    fetchTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateActive,
    updateTemplatePriority,
    testTemplateAgainstEmail
  };
}
