'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Baby,
  FileText,
  FileCheck, 
  Users,
  HardDrive,
  History,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  className?: string;
}

export default function Sidebar({ collapsed, setCollapsed, className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

  if (!user) return null;

  const roleNameMapping = {
    ADMIN: 'Administrator',
    MRO: 'Records Officer',
    PHYSICIAN: 'Hospital Physician',
    CRO: 'Registry Officer',
    LCR: 'Civil Registrar',
  };

  const roleColorMapping = {
    ADMIN: 'bg-red-50 text-red-700 border-red-200',
    MRO: 'bg-blue-50 text-blue-700 border-blue-200',
    PHYSICIAN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CRO: 'bg-purple-50 text-purple-700 border-purple-200',
    LCR: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'MRO', 'PHYSICIAN', 'CRO', 'LCR'],
    },
    {
      title: 'Birth Records',
      href: '/dashboard/birth',
      icon: Baby,
      roles: ['ADMIN', 'MRO', 'PHYSICIAN', 'CRO', 'LCR'],
    },
    {
      title: 'Death Records',
      href: '/dashboard/death',
      icon: FileText,
      roles: ['ADMIN', 'MRO', 'PHYSICIAN', 'CRO', 'LCR'],
    },
    {
      title: 'Certificate Requests',
      href: '/dashboard/requests',
      icon: FileCheck,
      roles: ['ADMIN', 'CRO', 'LCR'], 
    },
    {
      title: 'Reports & Analytics',
      href: '/dashboard/reports',
      icon: BarChart3,
      roles: ['ADMIN', 'MRO', 'PHYSICIAN', 'CRO', 'LCR'],
    },
    {
      title: 'User Management',
      href: '/dashboard/users',
      icon: Users,
      roles: ['ADMIN'],
    },
    {
      title: 'Files',
      href: '/dashboard/storage',
      icon: HardDrive,
      roles: ['ADMIN'],
    },
    {
      title: 'System Audit Logs',
      href: '/dashboard/audit',
      icon: History,
      roles: ['ADMIN'],
    },
    {
      title: 'Profile Settings',
      href: '/dashboard/profile',
      icon: Settings,
      roles: ['ADMIN', 'MRO', 'PHYSICIAN', 'CRO', 'LCR'],
    },
  ];

  const allowedNavItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <motion.aside
      animate={{ width: collapsed ? '4.5rem' : '16rem' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-30 shrink-0 select-none shadow-sm shadow-slate-100 ${className || ''}`}
    >
      {/* Sidebar Header */}
      <div className={`h-16 flex items-center border-b border-slate-100 transition-all duration-300 ${
        collapsed ? 'justify-center px-2' : 'justify-between px-4'
      }`}>
        <div className={`flex items-center gap-3 overflow-hidden flex-1 py-1 ${
          collapsed ? 'justify-center' : ''
        }`}>
          <img 
            src="/logo.png" 
            alt="MediRecord Logo" 
            className={`object-contain transition-all duration-300 shrink-0 ${
              collapsed ? 'h-9 w-9' : 'h-16 w-auto max-w-[130px]'
            }`} 
          />

          {!collapsed && (
            <div className="flex flex-col justify-center border-l border-slate-200/80 pl-0 leading-tight transition-opacity duration-300">
              <span className="text-[15px] font-black text-slate-800 tracking-tight">
                MediRecord
              </span>
              <span className="text-[11px] font-bold text-teal-700 tracking-tight">
                APEMDH Portal
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg hidden md:block shrink-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* User Information */}
      <div className="p-4 border-b border-slate-100 flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${
          user.role === 'ADMIN' ? 'bg-red-600' :
          user.role === 'PHYSICIAN' ? 'bg-emerald-600' :
          user.role === 'MRO' ? 'bg-blue-600' :
          user.role === 'CRO' ? 'bg-purple-600' : 'bg-amber-600'
        }`}>
          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-center w-full overflow-hidden"
          >
            <h3 className="font-bold text-slate-800 text-sm truncate leading-tight">{user.name}</h3>
            <span className="text-[10px] text-slate-400 block truncate mb-1.5">{user.email}</span>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColorMapping[user.role]}`}>
              {roleNameMapping[user.role]}
            </span>
          </motion.div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allowedNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative group ${
                isActive
                  ? 'text-teal-700 bg-teal-50/50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
              
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate"
                >
                  {item.title}
                </motion.span>
              )}

              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-150 z-50 whitespace-nowrap shadow-md">
                  {item.title}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50/50 transition-all duration-150 group relative cursor-pointer"
        >
          <LogOut className="h-5 w-5 text-red-500 group-hover:text-red-600 shrink-0" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Sign Out
            </motion.span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-150 z-50 whitespace-nowrap shadow-md">
              Sign Out
            </div>
          )}
        </button>
      </div>

      {/* Sign Out Confirmation Modal */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignOutConfirm(false)}
              className="fixed inset-0 bg-slate-900 z-50"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto h-fit w-full max-w-sm bg-white border border-slate-200 p-6 rounded-3xl z-[60] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
              
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <LogOut className="h-5 w-5 text-red-600" />
                <h3 className="font-bold text-slate-800 text-sm">Confirm Sign Out</h3>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to end your current session and sign out of the system? Any unsaved edits will be discarded.
                </p>
                
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowSignOutConfirm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={logout}
                    className="btn-primary bg-red-600 hover:bg-red-700 border-none text-white font-semibold"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}