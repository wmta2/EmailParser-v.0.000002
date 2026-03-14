import { Users, Mail, Inbox, LogOut, Menu, X, FileCode, ChevronDown, ChevronRight, User, ChevronLeft, ShoppingCart, Activity, CircleUser as UserCircle, LayoutGrid, Server, Upload, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

export type NavSection =
  | 'orders'
  | 'emails'
  | 'users'
  | 'invitations'
  | 'channels'
  | 'woocommerce-settings'
  | 'templates'
  | 'sync-logs'
  | 'channel-customers'
  | 'orderwise-customers'
  | 'orderwise-settings'
  | 'orderwise-api-logs'
  | 'gmail-settings'
  | 'profile';

interface SideNavProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  onSignOut: () => void;
  userEmail?: string;
  userRole?: 'super_admin' | 'admin' | 'user';
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface MenuItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<any>;
  requiredRole?: 'super_admin' | 'admin';
  hidden?: boolean;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
  requiredRole?: 'super_admin' | 'admin';
}

export function SideNav({ activeSection, onSectionChange, onSignOut, userEmail, userRole = 'user', onCollapsedChange }: SideNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['channels-group', 'users-group']);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  const hasAccess = (requiredRole?: 'super_admin' | 'admin'): boolean => {
    if (!requiredRole) return true;
    if (requiredRole === 'admin') return userRole === 'admin' || userRole === 'super_admin';
    if (requiredRole === 'super_admin') return userRole === 'super_admin';
    return true;
  };

  const singleItems: MenuItem[] = [
    { id: 'orders', label: 'Channel Orders', icon: Inbox, hidden: true },
    { id: 'emails', label: 'Email Orders', icon: Mail },
  ];

  const menuGroups: MenuGroup[] = [
    {
      id: 'channels-group',
      label: 'Sales Channels',
      icon: ShoppingCart,
      requiredRole: 'super_admin',
      items: [
        { id: 'channels', label: 'Channel Manager', icon: LayoutGrid, requiredRole: 'super_admin' },
        { id: 'woocommerce-settings', label: 'WooCommerce', icon: ShoppingCart, requiredRole: 'super_admin' },
        { id: 'gmail-settings', label: 'Gmail', icon: Mail, requiredRole: 'super_admin' },
        { id: 'templates', label: 'Email Templates', icon: FileCode, requiredRole: 'super_admin' },
        { id: 'sync-logs', label: 'Sync Logs', icon: Activity, requiredRole: 'super_admin' },
      ],
    },
    {
      id: 'erp-group',
      label: 'ERP Integrations',
      icon: Upload,
      requiredRole: 'super_admin',
      items: [
        { id: 'orderwise-settings', label: 'Orderwise', icon: Server, requiredRole: 'super_admin' },
        { id: 'orderwise-api-logs', label: 'API Logs', icon: FileText, requiredRole: 'super_admin' },
      ],
    },
    {
      id: 'customers-group',
      label: 'Customers',
      icon: UserCircle,
      items: [
        { id: 'channel-customers', label: 'Channel Customers', icon: ShoppingCart, hidden: true },
        { id: 'orderwise-customers', label: 'OW Customers', icon: Server },
      ],
    },
    {
      id: 'users-group',
      label: 'Users',
      icon: Users,
      requiredRole: 'admin',
      items: [
        { id: 'users', label: 'Registered Users', icon: Users, requiredRole: 'admin' },
        { id: 'invitations', label: 'Pending Invitations', icon: Mail, requiredRole: 'admin' },
      ],
    },
  ];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSectionClick = (section: NavSection) => {
    onSectionChange(section);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          bg-gradient-to-b from-slate-900 to-slate-800 text-white
          transform transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Portal
                </h1>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>
            {!isCollapsed && userEmail && (
              <p className="text-sm text-slate-400 mt-2 truncate">{userEmail}</p>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {singleItems.filter(item => !item.hidden).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSectionClick(id)}
                title={isCollapsed ? label : ''}
                className={`
                  w-full flex items-center rounded-lg
                  transition-all duration-200
                  ${isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'}
                  ${
                    activeSection === id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <Icon size={20} />
                {!isCollapsed && <span className="font-medium">{label}</span>}
              </button>
            ))}

            {!isCollapsed && menuGroups.filter(group => hasAccess(group.requiredRole)).map((group) => {
              const isExpanded = expandedGroups.includes(group.id);
              const GroupIcon = group.icon;
              const hasActiveItem = group.items.some(item => item.id === activeSection);

              return (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-lg
                      transition-all duration-200
                      ${
                        hasActiveItem
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon size={20} />
                      <span className="font-medium">{group.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={16} className="flex-shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {group.items.filter(item => hasAccess(item.requiredRole) && !item.hidden).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => handleSectionClick(id)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2 rounded-lg
                            transition-all duration-200 text-sm
                            ${
                              activeSection === id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }
                          `}
                        >
                          <Icon size={18} />
                          <span className="font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isCollapsed && menuGroups.filter(group => hasAccess(group.requiredRole)).flatMap(group =>
              group.items.filter(item => hasAccess(item.requiredRole) && !item.hidden)
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSectionClick(id)}
                title={label}
                className={`
                  w-full flex items-center justify-center px-3 py-3 rounded-lg
                  transition-all duration-200
                  ${
                    activeSection === id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <Icon size={20} />
              </button>
            ))}

            <div className="pt-4 border-t border-slate-700">
              <button
                onClick={() => handleSectionClick('profile')}
                title={isCollapsed ? 'Profile' : ''}
                className={`
                  w-full flex items-center rounded-lg
                  transition-all duration-200
                  ${isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'}
                  ${
                    activeSection === 'profile'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <User size={20} />
                {!isCollapsed && <span className="font-medium">Profile</span>}
              </button>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={onSignOut}
              title={isCollapsed ? 'Sign Out' : ''}
              className={`
                w-full flex items-center rounded-lg text-slate-300 hover:bg-red-600 hover:text-white
                transition-all duration-200
                ${isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'}
              `}
            >
              <LogOut size={20} />
              {!isCollapsed && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
