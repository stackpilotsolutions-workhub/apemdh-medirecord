'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { processRequestAction } from '@/app/actions/requests';
import {
  Search,
  Filter,
  Eye,
  FileCheck,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  Download,
  FileText,
  Paperclip,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CertificateRequest {
  id: string;
  created_at: string;
  updated_at: string;
  doc_type: 'BIRTH' | 'DEATH';
  subject_first_name: string;
  subject_middle_name?: string | null;
  subject_last_name: string;
  date_of_event?: string | null;
  requester_first_name: string;
  requester_middle_name?: string | null;
  requester_last_name: string;
  relationship: string;
  email: string;
  contact_number: string;
  purpose: string;
  marriage_cert_path?: string | null;
  parent_ids_path?: string[] | null;
  grandparent_ids_path?: string[] | null;
  requester_id_path?: string | null;
  auth_letter_path?: string | null;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'DENIED';
  admin_notes?: string | null;
}

interface AttachmentFile {
  label: string;
  path: string;
  url: string;
}

export default function DocumentRequestsPage() {
  const { user } = useAuth();

  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<CertificateRequest | null>(null);

  // Modal States
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'APPROVED' | 'DENIED' | 'REJECTED' | null;
  }>({ isOpen: false, type: null });
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);

  // Fetch Live Data
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificate_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data as CertificateRequest[]);
    } catch (error: any) {
      toast.error('Failed to load requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Open Modal Helper
  const openActionModal = (type: 'APPROVED' | 'DENIED') => {
    setActionModal({ isOpen: true, type });
  };

  const closeActionModal = () => {
    setActionModal({ isOpen: false, type: null });
    setAdminNotes('');
  };

  
  // Generate public download/view URLs from Supabase storage
  const getPublicUrl = (path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  };

  // Extract all uploaded documents for the selected request
  const getRequestAttachments = (req: CertificateRequest): AttachmentFile[] => {
    const files: AttachmentFile[] = [];

    if (req.requester_id_path) {
      files.push({
        label: "Requester's Valid ID",
        path: req.requester_id_path,
        url: getPublicUrl(req.requester_id_path),
      });
    }

    if (req.marriage_cert_path) {
      files.push({
        label: "Marriage Certificate",
        path: req.marriage_cert_path,
        url: getPublicUrl(req.marriage_cert_path),
      });
    }

    if (req.auth_letter_path) {
      files.push({
        label: "Authorization Letter",
        path: req.auth_letter_path,
        url: getPublicUrl(req.auth_letter_path),
      });
    }

    if (req.parent_ids_path && Array.isArray(req.parent_ids_path)) {
      req.parent_ids_path.forEach((path, index) => {
        files.push({
          label: `Parent ID #${index + 1}`,
          path,
          url: getPublicUrl(path),
        });
      });
    }

    if (req.grandparent_ids_path && Array.isArray(req.grandparent_ids_path)) {
      req.grandparent_ids_path.forEach((path, index) => {
        files.push({
          label: `Grandparent ID #${index + 1}`,
          path,
          url: getPublicUrl(path),
        });
      });
    }

    return files;
  };

  // Process Request (Calls Server Action with PDF generation & Email dispatch)
  const handleActionSubmit = async () => {
    if (!selectedRequest || !actionModal.type) return;

    // Standardized check for REJECTED / DENIED
    const isRejection = actionModal.type === 'REJECTED' || actionModal.type === 'DENIED';

    if (isRejection && !adminNotes.trim()) {
      toast.error('Please specify a rejection reason in Admin Notes.');
      return;
    }

    setActionLoading(true);

    try {
      const targetStatus = isRejection ? 'REJECTED' : 'APPROVED';

      const res = await processRequestAction({
        requestId: selectedRequest.id,
        status: targetStatus,
        adminNotes,
        adminName: user?.email || 'Admin User',
      });

      if (res.success) {
        toast.success(res.message);

        // Update local state and refetch
        fetchRequests();
        if (selectedRequest) {
          setSelectedRequest({
            ...selectedRequest,
            status: targetStatus,
            admin_notes: adminNotes,
          });
        }

        closeActionModal();
      } else {
        toast.error(`Error: ${res.error}`);
      }
    } catch (err: any) {
      toast.error('Unexpected error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering Logic
  const filteredRequests = requests.filter((r) => {
    const requesterFullName = `${r.requester_first_name} ${r.requester_middle_name || ''} ${r.requester_last_name}`.toLowerCase();
    const subjectFullName = `${r.subject_first_name} ${r.subject_middle_name || ''} ${r.subject_last_name}`.toLowerCase();
    const searchLower = search.toLowerCase();

    const matchesSearch =
      requesterFullName.includes(searchLower) ||
      subjectFullName.includes(searchLower) ||
      r.email.toLowerCase().includes(searchLower) ||
      r.id.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || r.doc_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: CertificateRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Clock className="h-3 w-3" />
            In Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-800 tracking-wider uppercase block">
            Civil Registry Database
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">
            Certificate & Document Requests
          </h1>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by requester, subject, or email..."
            className="input-field input-field-icon-left"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Certificate Types</option>
            <option value="BIRTH">Birth Certificate</option>
            <option value="DEATH">Death Certificate</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-teal-700 animate-spin" />
            <span className="text-xs text-slate-500">Loading database records...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileCheck className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No Document Requests Found</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4">Date Requested</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-all duration-100"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">
                        {r.requester_first_name} {r.requester_last_name}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{r.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {r.doc_type} CERTIFICATE
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {r.subject_first_name} {r.subject_last_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium capitalize">
                      {r.relationship}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedRequest(r)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 hover:border-teal-500 hover:text-teal-700 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side Slide-Over Panel */}
      <AnimatePresence>
        {selectedRequest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="fixed inset-0 bg-slate-900 z-40"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-teal-700" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Request Details</h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {selectedRequest.id}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Requester Info */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Requester Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 font-medium block">Full Name</span>
                      <span className="font-bold text-slate-800 block mt-0.5">
                        {selectedRequest.requester_first_name}{' '}
                        {selectedRequest.requester_middle_name || ''}{' '}
                        {selectedRequest.requester_last_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Relationship</span>
                      <span className="font-bold text-slate-700 block mt-0.5 capitalize">
                        {selectedRequest.relationship}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Contact Number</span>
                      <span className="font-bold text-slate-700 block mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {selectedRequest.contact_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Email Address</span>
                      <span className="font-bold text-slate-700 block mt-0.5 flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        {selectedRequest.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject Details */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Subject Details ({selectedRequest.doc_type})
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Subject Name</span>
                      <span className="font-bold text-slate-800 block mt-0.5">
                        {selectedRequest.subject_first_name}{' '}
                        {selectedRequest.subject_middle_name || ''}{' '}
                        {selectedRequest.subject_last_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Date of Event</span>
                      <span className="font-bold text-slate-700 block mt-0.5">
                        {selectedRequest.date_of_event
                          ? new Date(selectedRequest.date_of_event).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium block">Purpose of Request</span>
                      <span className="font-bold text-slate-700 block mt-0.5">
                        {selectedRequest.purpose}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Supporting Documents Section */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-teal-700" />
                    <span>Uploaded Supporting Documents</span>
                  </h4>

                  {getRequestAttachments(selectedRequest).length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">
                      No files uploaded for this request.
                    </span>
                  ) : (
                    <div className="space-y-2">
                      {getRequestAttachments(selectedRequest).map((doc, idx) => {
                        const fileName = doc.path.split('/').pop() || doc.label;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 border border-slate-200 bg-slate-50/70 rounded-xl text-xs font-medium"
                          >
                            <div className="flex items-center gap-2 truncate max-w-[200px] sm:max-w-[240px]">
                              <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-800 block truncate">
                                  {doc.label}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {fileName}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setPreviewFile({ name: doc.label, url: doc.url })}
                                className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Preview</span>
                              </button>
                              <a
                                href={doc.url}
                                download={fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                {selectedRequest.admin_notes && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Admin Notes
                    </h4>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                      {selectedRequest.admin_notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                {selectedRequest.status === 'PENDING' || selectedRequest.status === 'IN_REVIEW' ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => openActionModal('DENIED')}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => openActionModal('APPROVED')}
                      className="flex-1 btn-primary py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    {getStatusBadge(selectedRequest.status)}
                    <p className="text-[10px] text-slate-400 mt-2">
                      Processed on {new Date(selectedRequest.updated_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-up">
            {/* Preview Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block">
                  Document Viewer
                </span>
                <h3
                  className="text-sm font-bold text-slate-800 truncate max-w-[500px]"
                  title={previewFile.name}
                >
                  {previewFile.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/50 flex items-center justify-center min-h-[400px]">
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(previewFile.url) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xs"
                />
              ) : (
                <iframe
                  src={`${previewFile.url}#toolbar=0`}
                  className="w-full h-[65vh] border-0 rounded-xl shadow-xs bg-white"
                  title={previewFile.name}
                />
              )}
            </div>

            {/* Preview Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setPreviewFile(null)}
                className="btn-secondary text-xs !py-1.5 px-4 cursor-pointer"
              >
                Close
              </button>
              <a
                href={previewFile.url}
                download={previewFile.name}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs !py-1.5 px-4 cursor-pointer"
              >
                Download File
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Approve Confirmation Modal */}
      <AnimatePresence>
        {actionModal.isOpen && selectedRequest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={closeActionModal}
              className="fixed inset-0 bg-slate-900 z-[60]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto h-fit w-full max-w-md bg-white border border-slate-200 p-6 rounded-3xl z-[70] shadow-2xl overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  actionModal.type === 'APPROVED' ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              />

              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                {actionModal.type === 'APPROVED' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-bold text-slate-800 text-sm">
                  {actionModal.type === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
                </h3>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-600">
                  {actionModal.type === 'APPROVED'
                    ? `Are you sure you want to approve the ${selectedRequest.doc_type} certificate request for ${selectedRequest.subject_first_name} ${selectedRequest.subject_last_name}? An email with the generated PDF will be dispatched.`
                    : `Please specify a reason for rejecting this request.`}
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Admin Notes {(actionModal.type === 'REJECTED' || actionModal.type === 'DENIED') && '*'}
                  </label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={
                      actionModal.type === 'APPROVED'
                        ? 'Optional approval comments...'
                        : 'e.g. Discrepancy in relationship documents...'
                    }
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-800 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={closeActionModal}
                    disabled={actionLoading}
                    className="btn-secondary text-xs cursor-pointer px-4 py-2 border rounded-xl"
                  >
                    Cancel
                  </button>

                  {/* Submit Button */}
                  <button
                    onClick={handleActionSubmit}
                    disabled={
                      actionLoading || 
                      ((actionModal.type === 'REJECTED' || actionModal.type === 'DENIED') && !adminNotes.trim())
                    }
                    className={`btn-primary text-white font-semibold flex items-center gap-1.5 text-xs cursor-pointer px-4 py-2 rounded-xl disabled:opacity-50 ${
                      actionModal.type === 'APPROVED'
                        ? 'bg-emerald-700 hover:bg-emerald-800'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{actionModal.type === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}