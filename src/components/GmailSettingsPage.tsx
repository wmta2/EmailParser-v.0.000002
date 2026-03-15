import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { useGmailConnection, useGmailSyncLogs, useGmailSync, useGmailSettingsConfig } from '../hooks/useGmailSettings';
import { useGmailRules } from '../hooks/useGmailRules';
import { useTemplates } from '../hooks/useTemplates';
import { GmailConnectionSection } from './gmail/GmailConnectionSection';
import { GmailScheduleSection } from './gmail/GmailScheduleSection';
import { GmailSyncSection } from './gmail/GmailSyncSection';
import { GmailRulesSection } from './gmail/GmailRulesSection';
import type { StartMode } from './gmail/GmailStartModeModal';

const PAGE_SIZE = 5;

interface Props {
  onBack?: () => void;
}

export function GmailSettingsPage({ onBack }: Props) {
  const [logsPage, setLogsPage] = useState(1);
  const { connection, loading: connLoading, refetch: refetchConnection, disconnect } = useGmailConnection();
  const { logs, loading: logsLoading, totalCount, refetch: refetchLogs } = useGmailSyncLogs(PAGE_SIZE, logsPage);
  const { syncing, lastResult, syncNow, syncWithReset } = useGmailSync();
  const { settings, saveSettings } = useGmailSettingsConfig();
  const { rules, loading: rulesLoading, saving: rulesSaving, createRule, updateRule, deleteRule, moveRule } = useGmailRules();
  const { templates } = useTemplates();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handlePageChange = (page: number) => {
    setLogsPage(page);
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleSaveStartMode = async (mode: StartMode, specificDate: string | null) => {
    await saveSettings({
      start_mode: mode,
      sync_start_from: specificDate,
    });
  };

  const handleRefreshLogs = () => {
    setLogsPage(1);
    refetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-16 lg:pl-0">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-3">
            <Mail className="w-7 h-7 text-slate-700" />
            <h2 className="text-3xl font-bold text-slate-900">Gmail</h2>
          </div>
          <p className="text-slate-600 mt-1">Connect Gmail to automatically import order emails</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <GmailConnectionSection
            connection={connection}
            loading={connLoading}
            onConnected={refetchConnection}
            onDisconnect={handleDisconnect}
          />

          <GmailScheduleSection />
        </div>

        <div className="space-y-6">
          <GmailSyncSection
            syncing={syncing}
            lastResult={lastResult}
            settings={settings}
            onSync={syncNow}
            onSyncWithReset={syncWithReset}
            onSaveStartMode={handleSaveStartMode}
            logs={logs}
            logsLoading={logsLoading}
            onRefreshLogs={handleRefreshLogs}
            currentPage={logsPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <GmailRulesSection
        rules={rules}
        loading={rulesLoading}
        saving={rulesSaving}
        templates={templates}
        onCreate={createRule}
        onUpdate={updateRule}
        onDelete={deleteRule}
        onMove={moveRule}
      />
    </div>
  );
}
