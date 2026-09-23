'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getUsersAction,
  createUserAction,
  toggleUserStatusAction,
  resetUserPasswordAction,
} from '@/app/actions/users';
import { User, UserRole } from '@/lib/types';
import {
  Users,
  Plus,
  KeyRound,
  ShieldAlert,
  Search,
  UserCheck,
  UserX,
  X,
  Copy,
  Check,
  Briefcase,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MRO');
  const [newTitlePosition, setNewTitlePosition] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Displaying temporary password
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsersAction();
      setUsers(res);
    } catch (e) {
      toast.error('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      const res = await createUserAction({
        name: newName,
        email: newEmail,
        role: newRole,
        title_position: newTitlePosition,
        address: newAddress,
      } as any);

      if ((res as any).notes) {
        setTempPassword((res as any).notes);
      }

      toast.success('User account created successfully.');
      setNewName('');
      setNewEmail('');
      setNewRole('MRO');
      setNewTitlePosition('');
      setNewAddress('');
      setCreateModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user.');
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setLoading(true);
      const res = await toggleUserStatusAction(userId);
      toast.success(`Account status updated to ${res.status}.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to reset this user's password? They will be forced to change it on their next login."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const tempPass = await resetUserPasswordAction(userId);
      setTempPassword(tempPass);
      toast.success('Password reset completed.');
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Password copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term) ||
      (u as any).title_position?.toLowerCase().includes(term) ||
      (u as any).address?.toLowerCase().includes(term)
    );
  });

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="bg-red-50/80 border border-red-200 text-red-700 p-6 rounded-2xl text-sm flex flex-col gap-3 shadow-sm">
        <span className="font-bold flex items-center gap-2 text-base">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          Access Restrained
        </span>
        <p className="text-red-600/90 leading-relaxed">
          This module contains administrative user directories and is restricted to Hospital Administrators only.
        </p>
        <Link href="/dashboard" className="text-teal-700 font-semibold underline underline-offset-4 hover:text-teal-800">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <span className="text-[11px] font-extrabold text-teal-700 tracking-wider uppercase block">
            Hospital Directory
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            User Management
          </h1>
        </div>
        <button
          onClick={() => {
            setCreateModalOpen(true);
            setTempPassword(null);
          }}
          className="btn-primary shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Temporary Password Notice Modal */}
      <AnimatePresence>
        {tempPassword && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setTempPassword(null)}
              className="fixed inset-0 bg-slate-950 z-40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto h-fit w-full max-w-md bg-white border border-slate-200/80 p-6 rounded-2xl z-50 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  <span>Copy Temporary Password</span>
                </div>
                <button
                  onClick={() => setTempPassword(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  A temporary password has been allocated for this user. Copy it now and share it securely. The user is required to reset it upon their first sign in.
                </p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <span className="font-mono font-semibold text-sm text-slate-800 select-all flex-1 tracking-wider px-1">
                    {tempPassword}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tempPassword)}
                    className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:text-teal-700 transition-all shadow-2xs"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => setTempPassword(null)}
                    className="btn-primary bg-amber-600 hover:bg-amber-700 border-none shadow-xs"
                  >
                    Close & Finish
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, or role..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all placeholder:text-slate-400"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="text-[12px] font-medium text-slate-500 hidden sm:block">
          Total Users: <span className="font-bold text-slate-900">{filteredUsers.length}</span>
        </div>
      </div>

      {/* Modern Users Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-3 border-teal-600/20 border-t-teal-600 rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading user directory...</span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-5">Staff Member</th>
                    <th className="py-3.5 px-5">Role</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Password State</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 italic text-xs">
                        No user accounts matched your search details.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 transition-colors duration-150 group"
                      >
                        {/* Name & Avatar */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-full bg-teal-50 border border-teal-200/60 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {getInitials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate text-sm">
                                {u.name}
                              </span>
                              <span className="text-xs text-slate-500 block truncate font-mono">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {u.role}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {u.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        {/* Password State */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          {u.mustChangePassword ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-800 text-xs px-2.5 py-1 rounded-md">
                              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                              Reset Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium text-xs">
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              Verified
                            </span>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Mild Amber Reset Button */}
                            <button
                              onClick={() => handleResetPassword(u.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50/90 hover:bg-amber-100/80 border border-amber-200 hover:border-amber-300 rounded-lg transition-all duration-150 inline-flex items-center gap-1.5 shadow-2xs"
                              title="Reset Password"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-amber-700" />
                              <span>Reset</span>
                            </button>

                            {/* Mild Toggle Status Buttons */}
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleToggleStatus(u.id)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 border inline-flex items-center gap-1.5 shadow-2xs ${
                                  u.status === 'ACTIVE'
                                    ? 'bg-rose-50/90 hover:bg-rose-100/80 text-rose-900 border-rose-200 hover:border-rose-300'
                                    : 'bg-emerald-50/90 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200 hover:border-emerald-300'
                                }`}
                              >
                                {u.status === 'ACTIVE' ? (
                                  <>
                                    <UserX className="h-3.5 w-3.5 text-rose-700" />
                                    <span>Disable</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                                    <span>Enable</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <span className="text-xs text-slate-500 italic block text-center py-10">
                  No users found.
                </span>
              ) : (
                filteredUsers.map((u: any) => (
                  <div key={u.id} className="p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs flex items-center justify-center">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{u.name}</span>
                          <span className="text-[11px] text-slate-500 block font-mono">{u.email}</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold text-slate-500">Role:</span>
                        <span className="font-bold text-slate-900">{u.role}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold text-slate-500">Password:</span>
                        <span>
                          {u.mustChangePassword ? (
                            <span className="text-amber-800 font-bold text-[10px]">Reset Needed</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[10px]">Verified</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg flex-1 inline-flex items-center justify-center gap-1"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-amber-700" />
                        <span>Reset Pass</span>
                      </button>
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleStatus(u.id)}
                          className={`px-3 py-1.5 text-xs font-semibold border rounded-lg flex-1 inline-flex items-center justify-center gap-1 ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-900'
                              : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateModalOpen(false)}
              className="fixed inset-0 bg-slate-950 z-40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto h-fit w-full max-w-md bg-white border border-slate-200/80 p-6 rounded-2xl z-50 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-700" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider">
                  <Users className="h-4.5 w-4.5" />
                  <span>Create User Account</span>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Full Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Email Address *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. mro@apemdh.gov"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Title / Position</label>
                  <input
                    type="text"
                    value={newTitlePosition}
                    onChange={(e) => setNewTitlePosition(e.target.value)}
                    placeholder="e.g. Medical Records Officer II"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Address</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. San Fernando, Pampanga"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Registry Access Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                  >
                    <option value="MRO">Medical Records Officer (MRO)</option>
                    <option value="PHYSICIAN">Physician (Attending Medical Cert)</option>
                    <option value="CRO">Civil Registry Officer (CRO)</option>
                    <option value="LCR">Local Civil Registrar (LCR)</option>
                    <option value="ADMIN">Hospital Administrator (ADMIN)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary shadow-xs">
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}