import { ArrowLeft, Mail } from 'lucide-react';
import { useGmailConnection, useGmailSyncLogs, useGmailSync } from '../hooks/useGmailSettings';
import { useGmailRules } from '../hooks/useGmailRules';
import { useTemplates } from '../hooks/useTemplates';
import { GmailConnectionSection } from './gmail/GmailConnectionSection';
import { GmailScheduleSection } from './gmail/GmailScheduleSection';
import { GmailSyncSection } from './gmail/GmailSyncSection';
import { GmailRulesSection } from './gmail/GmailRulesSection';

interface Props {
  onBack?: () => void;
}

export function GmailSettingsPage({ onBack }: Props) {
  const { connection, loading: connLoading, refetch: refetchConnection, disconnect } = useGmailConnection();
  const { logs, loading: logsLoading, refetch: refetchLogs } = useGmailSyncLogs(15);
  const { syncing, lastResult, syncNow } = useGmailSync();
  const { rules, loading: rulesLoading, saving: rulesSaving, createRule, updateRule, deleteRule, moveRule } = useGmailRules();
  const { templates } = useTemplates();

  const handleDisconnect = async () => {
    await disconnect();
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
            onSync={syncNow}
            logs={logs}
            logsLoading={logsLoading}
            onRefreshLogs={refetchLogs}
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
