import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SideNav, type NavSection } from './SideNav';
import { OrdersPage } from './OrdersPage';
import { EmailListPage } from './EmailListPage';
import { ProfilePage } from './ProfilePage';
import { OrderwiseCustomersPage } from './CustomersPage';

export function UserDashboard() {
  const { profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('emails');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'orders':
        return <OrdersPage />;
      case 'emails':
        return <EmailListPage />;
      case 'orderwise-customers':
        return <OrderwiseCustomersPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <EmailListPage />;
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
