"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getBirthRecordsAction,
  submitToPhysicianAction,
  certifyBirthRecordAction,
  verifyBirthRecordAction,
  approveBirthRecordAction,
  finalizeLCRBirthAction,
  uploadBirthFileAction,
} from "@/app/actions/birth";
import { BirthRecord, RecordStatus } from "@/lib/types";
import {
  Search,
  Plus,
  Filter,
  Eye,
  FileBadge,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Download,
  Calendar,
  X,
  FileCheck,
  MapPin,
  Baby,
  Archive,
  UploadCloud,
  Loader2,
  ExternalLink,
  UserCheck, // Added missing Lucide Icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function BirthRegistryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BirthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRecord, setSelectedRecord] = useState<BirthRecord | null>(
    null,
  );

  // Attendant Certification Snapshot State Hooks
  const [attendantName, setAttendantName] = useState("");
  const [attendantPosition, setAttendantPosition] = useState("");
  const [attendantAddress, setAttendantAddress] = useState("");

  // File upload state for MRO verification
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // Pre-fill attendant details when a record or user state updates
  useEffect(() => {
    if (selectedRecord && user) {
      setAttendantName(selectedRecord.attendantName || user.name || "");
      setAttendantPosition(
        selectedRecord.attendantPosition ||
          user.title_position ||
          "Attending Physician",
      );
      setAttendantAddress(
        selectedRecord.attendantAddress || user.address || "",
      );
    }
  }, [selectedRecord, user]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await getBirthRecordsAction(search, statusFilter);
      setRecords(res);
    } catch (err) {
      toast.error("Failed to retrieve birth records.");
    } finally {
      setLoading(false);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const s = searchParams.get("search") || "";
    const st = searchParams.get("status") || "ALL";
    setSearch(s);
    setStatusFilter(st);
  }, [searchParams]);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  // Replace your handleAction definition with this:
  const handleAction = async (
    actionFn: (id: string, ...args: any[]) => Promise<BirthRecord>,
    successMsg: string,
  ) => {
    if (!selectedRecord) return;
    try {
      setLoading(true);
      const updated = await actionFn(selectedRecord.id);
      setSelectedRecord(updated);
      toast.success(successMsg);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Workflow transition failed.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler for Attendant Certification
  const handleCertifySubmit = async () => {
    if (!selectedRecord) return;
    try {
      setLoading(true);
      const certificationData = {
        attendant_name: attendantName,
        attendant_position: attendantPosition,
        attendant_address: attendantAddress,
      };

      const updated = await certifyBirthRecordAction(
        selectedRecord.id,
        certificationData,
      );
      setSelectedRecord(updated);
      toast.success("Medical details certified successfully.");
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Certification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecord) return;

    // Client-side limit: 4.5 MB
    const MAX_SIZE = 4.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 4.50 MB.`,
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingDoc(true);
      const res = await uploadBirthFileAction(selectedRecord.id, formData);
      if (res.success && res.record) {
        setSelectedRecord(res.record);
        toast.success(
          "Supporting document uploaded successfully to secure repository.",
        );
        fetchRecords();
      } else {
        toast.error(res.error || "File upload failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during file upload.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleVerifyComplete = async () => {
    if (!selectedRecord) return;
    if (selectedRecord.supportingDocuments.length === 0) {
      toast.error(
        "Please upload at least one supporting document (e.g. valid ID, birth affidavit) before completing verification.",
      );
      return;
    }

    try {
      setLoading(true);
      const updated = await verifyBirthRecordAction(selectedRecord.id, []);
      setSelectedRecord(updated);
      toast.success(
        "Record verified successfully and submitted for CRO review.",
      );
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Status Badge styles helper
  const getStatusBadge = (status: RecordStatus) => {
    const mappings = {
      DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
      PENDING_CERTIFICATION: "bg-blue-50 text-blue-700 border-blue-200",
      PENDING_VERIFICATION: "bg-indigo-50 text-indigo-700 border-indigo-200",
      PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
      SUBMITTED_LCR: "bg-purple-50 text-purple-700 border-purple-200",
      ARCHIVED: "bg-green-50 text-green-700 border-green-200",
    };
    const labels = {
      DRAFT: "Draft",
      PENDING_CERTIFICATION: "Pending MD Cert",
      PENDING_VERIFICATION: "Pending MRO Verify",
      PENDING_APPROVAL: "Pending CRO Approve",
      SUBMITTED_LCR: "Submitted LCR",
      ARCHIVED: "Registry Archived",
    };
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${mappings[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-800 tracking-wider uppercase block">
            APEMDH Civil Registry
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">
            Birth Certificate Registry
          </h1>
        </div>

        {/* Create button visible only for MRO and ADMIN */}
        {user?.role === "MRO" && (
          <Link href="/dashboard/birth/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>New Birth Record</span>
          </Link>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by child, certificate, mother or father name..."
            className="input-field input-field-icon-left"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Dropdown status filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Workflow Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_CERTIFICATION">Pending MD Cert</option>
            <option value="PENDING_VERIFICATION">Pending MRO Verify</option>
            <option value="PENDING_APPROVAL">Pending CRO Approve</option>
            <option value="SUBMITTED_LCR">Submitted to LCR</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-teal-700/20 border-t-teal-700 rounded-full animate-spin" />
            <span className="text-xs text-slate-500">
              Querying birth records...
            </span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Baby className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">
              No Birth Certificates Found
            </p>
            <p className="text-xs text-slate-400">
              Modify your search query or add a new record to start.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Certificate #</th>
                    <th className="py-3 px-4">Child Name</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Birth Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Duplicate Check</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-all duration-100"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {r.certificateNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">
                          {r.childName}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Mother: {r.motherName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {r.childGender}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {r.birthDate}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.duplicateStatus === "POTENTIAL_DUPLICATE" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Duplicate Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Unique
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 hover:border-teal-500 hover:text-teal-700"
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

            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {records.map((r) => (
                <div key={r.id} className="p-4 space-y-3 text-xs bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-slate-800 text-[10px] block">
                        Cert #: {r.certificateNumber}
                      </span>
                      <span className="font-bold text-slate-800 text-sm block mt-0.5">
                        {r.childName}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Mother: {r.motherName}
                      </span>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg space-y-1.5 text-[10px] text-slate-500 font-medium">
                    <div className="flex justify-between">
                      <span>Gender:</span>
                      <strong className="text-slate-700">
                        {r.childGender}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Birth Date:</span>
                      <strong className="text-slate-700">{r.birthDate}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Duplicate Status:</span>
                      {r.duplicateStatus === "POTENTIAL_DUPLICATE" ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Duplicate Alert
                        </span>
                      ) : (
                        <span className="text-green-600 font-bold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Unique
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-1 flex">
                    <button
                      onClick={() => setSelectedRecord(r)}
                      className="btn-secondary py-2 px-3 text-[10px] inline-flex items-center gap-1.5 flex-1 justify-center hover:border-teal-500 hover:text-teal-700 shadow-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Record</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Side Slide-Over Details Panel */}
      <AnimatePresence>
        {selectedRecord && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="fixed inset-0 bg-slate-900 z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileBadge className="h-5 w-5 text-teal-700" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Registry Details
                      </h3>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {selectedRecord.certificateNumber}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* View Full Details Page Link */}
                <a
                  href={`/dashboard/birth/view?id=${selectedRecord.id}`}
                  className="flex items-center justify-between p-3 bg-teal-50/60 hover:bg-teal-50 border border-teal-100/80 rounded-xl transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-teal-700 group-hover:scale-105 transition-transform" />
                    <span className="text-xs font-bold text-teal-900">
                      View Full Details Page
                    </span>
                  </div>
                  <span className="text-[10px] text-teal-700 font-medium group-hover:underline flex items-center gap-0.5">
                    Open page <ArrowRight className="h-3 w-3 inline" />
                  </span>
                </a>

                {/* Duplicate Banner Alert */}
                {selectedRecord.duplicateStatus === "POTENTIAL_DUPLICATE" && (
                  <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl space-y-1 text-red-800">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      Potential Duplicate Found
                    </span>
                    <p className="text-[10px] opacity-90 leading-normal">
                      Another birth certificate with the same child name, mother
                      name, and date of birth already exists in the system
                      database. Verify patient records to prevent duplicates.
                    </p>
                  </div>
                )}

                {/* Registry Form Information */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">
                      Child Full Name
                    </span>
                    <span className="font-bold text-slate-800 block text-sm mt-0.5">
                      {selectedRecord.childName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">
                      Gender
                    </span>
                    <span className="font-bold text-slate-800 block text-sm mt-0.5">
                      {selectedRecord.childGender}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">
                      Mother Name
                    </span>
                    <span className="font-bold text-slate-700 block mt-0.5">
                      {selectedRecord.motherName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">
                      Father Name
                    </span>
                    <span className="font-bold text-slate-700 block mt-0.5">
                      {selectedRecord.fatherName || "Not Stated"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">
                      Birth Date
                    </span>
                    <span className="font-bold text-slate-700 block mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {selectedRecord.birthDate} ({selectedRecord.birthTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">
                      Place of Birth
                    </span>
                    <span className="font-bold text-slate-700 block mt-0.5 flex items-center gap-0.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {selectedRecord.placeOfBirth}
                    </span>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* File Attachments */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Supporting Documents
                  </h4>
                  {selectedRecord.supportingDocuments.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">
                      No files uploaded.
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedRecord.supportingDocuments.map((doc, idx) => {
                        const isCombined = doc.includes("|");
                        const displayName = isCombined
                          ? doc.split("|")[0]
                          : doc;
                        const downloadUrl = isCombined
                          ? doc.split("|")[1]
                          : doc.startsWith("http") || doc.startsWith("/")
                            ? doc
                            : `/uploads/${doc}`;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 border border-slate-100 bg-slate-50/50 rounded-lg text-xs font-semibold"
                          >
                            <span className="text-slate-600 truncate max-w-[150px] sm:max-w-[200px]">
                              {displayName}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  setPreviewFile({
                                    name: displayName,
                                    url: downloadUrl,
                                  })
                                }
                                className="text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Preview</span>
                              </button>
                              <a
                                href={downloadUrl}
                                download={displayName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
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

                <hr className="border-slate-100" />

                {/* Workflow Timeline Track */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Workflow Verification Audit
                  </h4>

                  <div className="relative border-l-2 border-teal-100 pl-4 space-y-4 text-xs ml-2">
                    {/* Draft Creation */}
                    <div className="relative">
                      <div className="absolute -left-[23px] top-0 h-3 w-3 rounded-full bg-teal-500 ring-4 ring-white" />
                      <div>
                        <span className="font-bold text-slate-700 block">
                          Record Initiated (Draft)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(selectedRecord.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Certification */}
                    <div className="relative">
                      <div
                        className={`absolute -left-[23px] top-0 h-3 w-3 rounded-full ring-4 ring-white ${selectedRecord.certifiedBy ? "bg-teal-500" : "bg-slate-200"}`}
                      />
                      <div>
                        <span className="font-bold text-slate-700 block">
                          Medical Details Certified
                        </span>
                        {selectedRecord.certifiedBy ? (
                          <>
                            <span className="text-slate-500 block">
                              Certified by: {selectedRecord.certifiedBy}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(
                                selectedRecord.certifiedAt!,
                              ).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic block">
                            Awaiting Physician Certification
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Verification */}
                    <div className="relative">
                      <div
                        className={`absolute -left-[23px] top-0 h-3 w-3 rounded-full ring-4 ring-white ${selectedRecord.verifiedBy ? "bg-teal-500" : "bg-slate-200"}`}
                      />
                      <div>
                        <span className="font-bold text-slate-700 block">
                          Completeness Verified & Files Uploaded
                        </span>
                        {selectedRecord.verifiedBy ? (
                          <>
                            <span className="text-slate-500 block">
                              Verified by MRO: {selectedRecord.verifiedBy}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(
                                selectedRecord.verifiedAt!,
                              ).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic block">
                            Awaiting MRO Verification
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Approval */}
                    <div className="relative">
                      <div
                        className={`absolute -left-[23px] top-0 h-3 w-3 rounded-full ring-4 ring-white ${selectedRecord.approvedBy ? "bg-teal-500" : "bg-slate-200"}`}
                      />
                      <div>
                        <span className="font-bold text-slate-700 block">
                          CRO Reviewed & Approved
                        </span>
                        {selectedRecord.approvedBy ? (
                          <>
                            <span className="text-slate-500 block">
                              Approved by CRO: {selectedRecord.approvedBy}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(
                                selectedRecord.approvedAt!,
                              ).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic block">
                            Awaiting CRO Approval
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Archival LCR */}
                    <div className="relative">
                      <div
                        className={`absolute -left-[23px] top-0 h-3 w-3 rounded-full ring-4 ring-white ${selectedRecord.submittedBy ? "bg-teal-500" : "bg-slate-200"}`}
                      />
                      <div>
                        <span className="font-bold text-slate-700 block">
                          Local Civil Registry Finalized (Archived)
                        </span>
                        {selectedRecord.submittedBy ? (
                          <>
                            <span className="text-slate-500 block">
                              Finalized by LCR: {selectedRecord.submittedBy}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(
                                selectedRecord.submittedAt!,
                              ).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic block">
                            Awaiting LCR Archival
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Operations Area */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                {/* MRO submit to physician */}
                {selectedRecord.status === "DRAFT" &&
                  (user?.role === "MRO" || user?.role === "ADMIN") && (
                    <button
                      onClick={() =>
                        handleAction(
                          submitToPhysicianAction,
                          "Record submitted to physician for certification.",
                        )
                      }
                      className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                    >
                      <span>Submit to Physician for Certification</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}

                {/* Physician certify details + Inline Form Fields */}
                {selectedRecord.status === "PENDING_CERTIFICATION" &&
                  (user?.role === "PHYSICIAN" || user?.role === "ADMIN") && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                          <UserCheck className="h-4 w-4 text-emerald-600" />
                          Attendant Certification Details
                        </h5>

                        {/* Attendant Name */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={attendantName}
                            onChange={(e) => setAttendantName(e.target.value)}
                            placeholder="e.g. Dr. Maria Santos, MD"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-800"
                          />
                        </div>

                        {/* Attendant Title/Position */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            Title or Position *
                          </label>
                          <input
                            type="text"
                            value={attendantPosition}
                            onChange={(e) =>
                              setAttendantPosition(e.target.value)
                            }
                            placeholder="e.g. Attending Physician / OB-GYN"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-800"
                          />
                        </div>

                        {/* Attendant Facility/Clinic Address */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            Address *
                          </label>
                          <textarea
                            rows={2}
                            value={attendantAddress}
                            onChange={(e) =>
                              setAttendantAddress(e.target.value)
                            }
                            placeholder="e.g. Alfonso Ponce Enrile Memorial District Hospital, Gonzaga, Cagayan"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-800 resize-none"
                          />
                        </div>

                        {/* Automatic Date Indicator */}
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                          <span>Certification Date:</span>
                          <span className="font-bold text-slate-600">
                            {new Date().toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleCertifySubmit}
                        disabled={
                          loading ||
                          !attendantName ||
                          !attendantPosition ||
                          !attendantAddress
                        }
                        className="btn-primary w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileCheck className="h-4 w-4" />
                        )}
                        <span>Certify Medical Birth Details</span>
                      </button>
                    </div>
                  )}

                {/* MRO Upload files and Complete verification */}
                {selectedRecord.status === "PENDING_VERIFICATION" &&
                  (user?.role === "MRO" || user?.role === "ADMIN") && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                          Upload Supporting File *
                        </label>
                        <label className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 transition-colors">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploadingDoc}
                            accept=".pdf,.png,.jpg,.jpeg"
                          />
                          {uploadingDoc ? (
                            <Loader2 className="h-7 w-7 text-teal-600 animate-spin" />
                          ) : (
                            <UploadCloud className="h-7 w-7 text-slate-400" />
                          )}
                          <span className="text-xs text-slate-600 font-bold">
                            {uploadingDoc
                              ? "Uploading supporting document..."
                              : "Select File (PDF, PNG, JPG)"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Up to 4.5MB file allocation
                          </span>
                        </label>
                      </div>

                      <button
                        onClick={handleVerifyComplete}
                        disabled={loading || uploadingDoc}
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileCheck className="h-4 w-4" />
                        <span>Complete Verification & Submit to CRO</span>
                      </button>
                    </div>
                  )}

                {/* CRO Approve */}
                {selectedRecord.status === "PENDING_APPROVAL" &&
                  (user?.role === "CRO" || user?.role === "ADMIN") && (
                    <button
                      onClick={() =>
                        handleAction(
                          approveBirthRecordAction,
                          "Birth certificate approved and dispatched to Local Civil Registrar.",
                        )
                      }
                      className="btn-primary w-full py-2.5 bg-purple-700 hover:bg-purple-800 flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Approve & Submit to Local Registrar</span>
                    </button>
                  )}

                {/* LCR final archiving */}
                {selectedRecord.status === "SUBMITTED_LCR" &&
                  (user?.role === "LCR" || user?.role === "ADMIN") && (
                    <button
                      onClick={() =>
                        handleAction(
                          finalizeLCRBirthAction,
                          "Civil registry finalized and record locked in Archives.",
                        )
                      }
                      className="btn-primary w-full py-2.5 bg-green-700 hover:bg-green-800 flex items-center justify-center gap-2"
                    >
                      <Archive className="h-4 w-4" />
                      <span>Finalize, Register & Archive Record</span>
                    </button>
                  )}

                {/* Non-authorized warning */}
                {selectedRecord.status !== "ARCHIVED" && (
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Current stage requires action from authorized{" "}
                    {selectedRecord.status === "DRAFT"
                      ? "MRO"
                      : selectedRecord.status === "PENDING_CERTIFICATION"
                        ? "Physician"
                        : selectedRecord.status === "PENDING_VERIFICATION"
                          ? "MRO"
                          : selectedRecord.status === "PENDING_APPROVAL"
                            ? "CRO"
                            : "LCR"}{" "}
                    personnel.
                  </p>
                )}

                {selectedRecord.status === "ARCHIVED" && (
                  <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl text-center text-[10px] text-green-800 font-semibold">
                    This civil registry document is fully finalized and
                    archived. No further actions required.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-up">
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/50 flex items-center justify-center min-h-[400px]">
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(previewFile.url) ||
              /\.(jpg|jpeg|png|gif|webp)$/i.test(previewFile.name) ? (
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setPreviewFile(null)}
                className="btn-secondary text-xs !py-1.5 px-4"
              >
                Close
              </button>
              <a
                href={previewFile.url}
                download={previewFile.name}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs !py-1.5 px-4"
              >
                Download File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
