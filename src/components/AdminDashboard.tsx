import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SideNav, type NavSection } from './SideNav';
import { RegisteredUsersPage } from './RegisteredUsersPage';
import { PendingInvitationsPage } from './PendingInvitationsPage';
import { OrdersPage } from './OrdersPage';
import { EmailListPage } from './EmailListPage';
import { TemplateListPage } from './TemplateListPage';
import { TemplateFormPage } from './TemplateFormPage';
import { ChannelManagerPage } from './ChannelManagerPage';
import { WooCommerceSettingsPage } from './WooCommerceSettingsPage';
import { SyncLogsPage } from './SyncLogsPage';
import { OrderwiseCustomersPage } from './CustomersPage';
import { ChannelCustomersPage } from './ChannelCustomersPage';
import { OrderwiseSettingsPage } from './OrderwiseSettingsPage';
import { OrderwiseApiLogsPage } from './OrderwiseApiLogsPage';
import { ProfilePage } from './ProfilePage';
import { GmailSettingsPage } from './GmailSettingsPage';

export function AdminDashboard() {
  const { profile, signOut, isAdmin, isSuperAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('emails');
  const [templateView, setTemplateView] = useState<'list' | 'form'>('list');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get('gmail');
    if (gmailParam) {
      setActiveSection('gmail-settings');
      const url = new URL(window.location.href);
      url.searchParams.delete('gmail');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleCreateNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateView('form');
  };

  const handleEditTemplate = (id: string) => {
    setEditingTemplateId(id);
    setTemplateView('form');
  };

  const handleBackToList = () => {
    setTemplateView('list');
    setEditingTemplateId(null);
  };

  const noPermission = (
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
      <p className="text-slate-600">You do not have permission to access this section.</p>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'orders':
        return <OrdersPage />;
      case 'emails':
        return <EmailListPage />;
      case 'users':
        return isAdmin ? <RegisteredUsersPage /> : noPermission;
      case 'invitations':
        return isAdmin ? <PendingInvitationsPage /> : noPermission;
      case 'channels':
        return isSuperAdmin ? (
          <ChannelManagerPage
            onNavigateToChannel={(slug) => {
              if (slug === 'woocommerce') setActiveSection('woocommerce-settings');
            }}
          />
        ) : noPermission;
      case 'woocommerce-settings':
        return isSuperAdmin
          ? <WooCommerceSettingsPage onBack={() => setActiveSection('channels')} />
          : noPermission;
      case 'orderwise-settings':
        return isSuperAdmin
          ? <OrderwiseSettingsPage
              onBack={() => setActiveSection('orders')}
              onNavigateToLogs={() => setActiveSection('orderwise-api-logs')}
            />
          : noPermission;
      case 'orderwise-api-logs':
        return isSuperAdmin
          ? <OrderwiseApiLogsPage onBack={() => setActiveSection('orderwise-settings')} />
          : noPermission;
      case 'gmail-settings':
        return isSuperAdmin
          ? <GmailSettingsPage onBack={() => setActiveSection('channels')} />
          : noPermission;
      case 'sync-logs':
        return isSuperAdmin ? <SyncLogsPage /> : noPermission;
      case 'channel-customers':
        return isAdmin ? <ChannelCustomersPage /> : noPermission;
      case 'orderwise-customers':
        return isAdmin ? <OrderwiseCustomersPage /> : noPermission;
      case 'templates':
        if (!isSuperAdmin) return noPermission;
        return templateView === 'list' ? (
          <TemplateListPage
            onCreateNew={handleCreateNewTemplate}
            onEdit={handleEditTemplate}
          />
        ) : (
          <TemplateFormPage
            templateId={editingTemplateId}
            onBack={handleBackToList}
            onSave={handleBackToList}
          />
        );
      case 'profile':
        return <ProfilePage />;
      default:
        return <OrdersPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <SideNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={signOut}
        userEmail={profile?.email}
        userRole={profile?.role}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      <main className="flex-1 overflow-auto transition-all duration-300">
        <div className="px-4 py-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
