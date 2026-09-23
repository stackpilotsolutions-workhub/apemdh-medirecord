'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  ShieldCheck,
  FileText,
  ChevronRight,
  ArrowRight,
  Building,
  ShieldAlert,
  Archive,
  FileCheck,
  X,
  Send,
  CheckCircle2,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home({ user }: { user?: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [docType, setDocType] = useState<'BIRTH' | 'DEATH'>('BIRTH');
  const [formData, setFormData] = useState({
    // Subject Name
    subjectFirstName: '',
    subjectMiddleName: '',
    subjectLastName: '',
    dateOfEvent: '',
    
    // Requester Name
    requesterFirstName: '',
    requesterMiddleName: '',
    requesterLastName: '',
    
    relationship: 'Parent',
    isMarried: 'yes',
    isMotherUnder18: 'no',
    email: '',
    contactNumber: '',
    purpose: ''
  });

  const [marriageCert, setMarriageCert] = useState<File | null>(null);
  const [parentIds, setParentIds] = useState<FileList | null>(null);
  const [grandparentIds, setGrandparentIds] = useState<FileList | null>(null);
  const [requesterId, setRequesterId] = useState<File | null>(null);
  const [authLetter, setAuthLetter] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data, error } = await supabase.storage.from('documents').upload(fileName, file);
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let marriageCertPath = null;
      let parentIdsPaths: string[] = [];
      let grandparentIdsPaths: string[] = [];
      let requesterIdPath = null;
      let authLetterPath = null;

      if (docType === 'BIRTH') {
        if (formData.isMarried === 'yes' && marriageCert) {
          marriageCertPath = await uploadFile(marriageCert, 'marriage_certs');
        }
        if (formData.isMarried === 'no' && parentIds) {
          for (let i = 0; i < parentIds.length; i++) {
            const path = await uploadFile(parentIds[i], 'parent_ids');
            parentIdsPaths.push(path);
          }
        }
        if (formData.isMotherUnder18 === 'yes' && grandparentIds) {
          for (let i = 0; i < grandparentIds.length; i++) {
            const path = await uploadFile(grandparentIds[i], 'grandparent_ids');
            grandparentIdsPaths.push(path);
          }
        }
      } else {
        if (requesterId) {
          requesterIdPath = await uploadFile(requesterId, 'requester_ids');
        }
      }

      if (formData.relationship === 'Non-Relative' && authLetter) {
        authLetterPath = await uploadFile(authLetter, 'auth_letters');
      }

      const { error } = await supabase.from('certificate_requests').insert([
        {
          doc_type: docType,
          subject_first_name: formData.subjectFirstName,
          subject_middle_name: formData.subjectMiddleName || null,
          subject_last_name: formData.subjectLastName,
          date_of_event: formData.dateOfEvent || null,
          
          requester_first_name: formData.requesterFirstName,
          requester_middle_name: formData.requesterMiddleName || null,
          requester_last_name: formData.requesterLastName,
          
          relationship: formData.relationship,
          email: formData.email,
          contact_number: formData.contactNumber,
          purpose: formData.purpose,
          
          marriage_cert_path: marriageCertPath,
          parent_ids_path: parentIdsPaths,
          grandparent_ids_path: grandparentIdsPaths,
          requester_id_path: requesterIdPath,
          auth_letter_path: authLetterPath
        }
      ]);

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setIsSubmitted(false);
    setDocType('BIRTH');
    setVerificationStatus('idle');
    setMatchedRecord(null);
    setFormData({
      subjectFirstName: '',
      subjectMiddleName: '',
      subjectLastName: '',
      dateOfEvent: '',
      requesterFirstName: '',
      requesterMiddleName: '',
      requesterLastName: '',
      relationship: 'Parent',
      isMarried: 'yes',
      isMotherUnder18: 'no',
      email: '',
      contactNumber: '',
      purpose: ''
    });
    setMarriageCert(null);
    setParentIds(null);
    setGrandparentIds(null);
    setRequesterId(null);
    setAuthLetter(null);
  };

  //just added today
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [matchedRecord, setMatchedRecord] = useState<any>(null);

  useEffect(() => {
    const { subjectFirstName, subjectMiddleName, subjectLastName } = formData;

    const firstName = subjectFirstName.trim();
    const middleName = subjectMiddleName ? subjectMiddleName.trim() : '';
    const lastName = subjectLastName.trim();

    // Require both First Name and Last Name before querying
    if (!firstName || !lastName) {
      setVerificationStatus('idle');
      setMatchedRecord(null);
      return;
    }

    setVerificationStatus('loading');

    const timer = setTimeout(async () => {
      try {
        const table = docType === 'BIRTH' ? 'birth_records' : 'death_records';
        const nameCol = docType === 'BIRTH' ? 'child_name' : 'deceased_name';

        // JSON path keys
        const jsonFirst = docType === 'BIRTH' ? 'details->child->>firstName' : 'details->deceased->>firstName';
        const jsonMiddle = docType === 'BIRTH' ? 'details->child->>middleName' : 'details->deceased->>middleName';
        const jsonLast = docType === 'BIRTH' ? 'details->child->>lastName' : 'details->deceased->>lastName';

        // 1. Check direct JSON fields (exact string match on structured JSON data)
        let jsonQuery = supabase
          .from(table)
          .select('*')
          .ilike(jsonFirst, firstName)
          .ilike(jsonLast, lastName);

        if (middleName) {
          jsonQuery = jsonQuery.ilike(jsonMiddle, middleName);
        }

        const { data: jsonMatch, error: jsonErr } = await jsonQuery.limit(1);
        if (jsonErr) throw jsonErr;

        if (jsonMatch && jsonMatch.length > 0) {
          setMatchedRecord(jsonMatch[0]);
          setVerificationStatus('found');
          return;
        }

        // 2. Main string name column check using strict word boundary filter
        // Clean tokens for SQL ILIKE matching
        let mainQuery = supabase
          .from(table)
          .select('*')
          .ilike(nameCol, `% ${lastName}`)    
          .or(`${nameCol}.ilike.${lastName},${nameCol}.ilike.% ${lastName} %`); 

        const firstNameTokens = firstName.split(/\s+/);
        firstNameTokens.forEach((token) => {
          mainQuery = mainQuery.ilike(nameCol, `%${token}%`);
        });

        if (middleName) {
          mainQuery = mainQuery.ilike(nameCol, `%${middleName}%`);
        }

        const { data: mainMatch, error: mainErr } = await mainQuery.limit(1);
        if (mainErr) throw mainErr;

        if (mainMatch && mainMatch.length > 0) {
          const fullRecordName = (mainMatch[0][nameCol] || '').toLowerCase();
          const inputLastName = lastName.toLowerCase();

          const recordWords = fullRecordName.split(/\s+/);
          const hasLastNameWord = recordWords.some((word: string) => word === inputLastName);

          if (hasLastNameWord) {
            setMatchedRecord(mainMatch[0]);
            setVerificationStatus('found');
            return;
          }
        }

        setMatchedRecord(null);
        setVerificationStatus('not_found');
      } catch (err: any) {
        console.error('Record verification error:', err?.message || err?.details || JSON.stringify(err));
        setMatchedRecord(null);
        setVerificationStatus('not_found');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.subjectFirstName, formData.subjectMiddleName, formData.subjectLastName, docType]);
  // end of added today

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-teal-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="MediRecord Logo" className="h-10 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">MediRecord</span>
              <span className="text-[9px] text-teal-600 font-semibold tracking-wider uppercase mt-0.5">APEMDH Portal</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-500">
            <a href="#hero" className="hover:text-teal-700 transition-colors">Overview</a>
            <a href="#about" className="hover:text-teal-700 transition-colors">About APEMDH</a>
            <a href="#features" className="hover:text-teal-700 transition-colors">Key Features</a>
            <a href="#security" className="hover:text-teal-700 transition-colors">System Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold px-4 py-2 rounded-xl transition-all border border-teal-200"
            >
              Request Certificate
            </button>
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs !py-1.5 px-4 flex items-center gap-1.5">
                Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link href="/login" className="btn-primary text-xs !py-1.5 px-5 flex items-center gap-1.5">
                Sign In <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative py-20 lg:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-[10px] font-extrabold uppercase tracking-wider text-teal-700 mb-6">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Hospital Registry Management
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
              APEMDH Civil Registry <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600">
                Document Management
              </span>
            </h1>

            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-2xl mb-8">
              A comprehensive system custom-designed for Alfonso Ponce Enrile Memorial District Hospital. 
              Enables secure record collation, medically certified approvals, and official online requests for birth and death registry documents.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm shadow-md hover:shadow-lg transition-all"
              >
                Request Certificate
                <ChevronRight className="h-4 w-4" />
              </button>
              <a href="#about" className="btn-secondary px-6 py-3 font-semibold flex items-center gap-1.5 text-sm hover:bg-slate-50 transition-all">
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-white border-y border-slate-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-700/5 to-cyan-500/5 rounded-3xl -rotate-2 scale-105" />
              <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl shadow-sm relative overflow-hidden space-y-6">
                <div className="h-2.5 bg-gradient-to-r from-teal-600 to-cyan-500 absolute top-0 inset-x-0" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-50 rounded-2xl text-teal-700 shrink-0">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">APEMDH</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hospital Care &amp; Service</p>
                  </div>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Alfonso Ponce Enrile Memorial District Hospital plays a vital role in providing healthcare services and managing official civil records for the community.
                </p>
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <div className="p-3 bg-white border border-slate-100 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Compliance</span>
                    <span className="text-xs font-bold text-teal-700 mt-1 block">RA 10173 Protected</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-100 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Cloud Storage</span>
                    <span className="text-xs font-bold text-teal-700 mt-1 block">Private Cloud Vault</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block">Institutional Core</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Empowering Healthcare Records with Integrity &amp; Transparency
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                The MediRecord system was initiated to address physical documentation issues and replace outdated registry logging with a cloud-resilient, role-restricted dashboard. By standardizing registry input, the hospital prevents identity errors, guards medical verification steps, and maintains precise audit compliance logs.
              </p>
              <div className="space-y-4 pt-2">
                {[
                  {
                    title: "Legal & HIPAA/DPA Compliance",
                    desc: "Enforces mandatory password resets, session auto-logouts, and restricted data layers matching the Data Privacy Act of 2012 guidelines."
                  },
                  {
                    title: "Dual Birth & Death Tracking",
                    desc: "Structured schemas and strict workflows distinguish and validate birth records and death certificates separately with zero duplication overlap."
                  },
                  {
                    title: "Permanent Accountability",
                    desc: "An immutable audit trail keeps permanent administrative logs detailing creating, editing, certifying, verifying, and exporting files."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3.5">
                    <div className="h-5 w-5 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-black">{idx + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block">Features &amp; Modules</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">System Workflow Architecture</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Every birth and death certificate goes through a secure multi-stage pipeline, managed and verified by specific hospital personnel.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "1. Registry Data Entry",
                desc: "Medical Records Officers (MRO) encode certificate details and upload scanned supporting papers to Supabase Storage.",
                icon: FileText,
                color: "text-blue-600 bg-blue-50 border-blue-100/50"
              },
              {
                title: "2. Attending Certification",
                desc: "Authorized attending Physicians certify the medical aspects and cause of birth/death parameters for safety validation.",
                icon: FileCheck,
                color: "text-amber-600 bg-amber-50 border-amber-100/50"
              },
              {
                title: "3. Civil Verification",
                desc: "Medical Records Officers verify certification Cause-of-Death criteria & ICD-10 medical coding formats.",
                icon: ShieldAlert,
                color: "text-teal-600 bg-teal-50 border-teal-100/50"
              },
              {
                title: "4. Archival Locking",
                desc: "Local Civil Registrars review, assign registry book numbers, and lock documents permanently in archives.",
                icon: Archive,
                color: "text-purple-600 bg-purple-50 border-purple-100/50"
              }
            ].map((step, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl border border-slate-100 bg-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[160px] relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">APEMDH Flow</span>
                    <div className={`p-2 border rounded-2xl ${step.color}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10 space-y-6">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-1 bg-teal-800/80 border border-teal-700 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
              Technical Safety Protocol
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Protected by Modern Cloud Standards</h2>
            <p className="text-teal-100/80 text-xs sm:text-sm leading-relaxed">
              MediRecord protects sensitive medical data by utilizing a decoupled server architecture. All file uploads are sent to private Supabase Storage buckets, database updates are regulated by Supabase Row-Level Security policies, and sessions are encrypted using base64 HTTP cookies with strict server-side route guards.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4">
              <div className="space-y-1">
                <span className="text-[10px] text-teal-300 font-bold uppercase block tracking-widest">Database</span>
                <span className="text-xs font-semibold block text-white">PostgreSQL &amp; Supabase</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-teal-300 font-bold uppercase block tracking-widest">Network Encryption</span>
                <span className="text-xs font-semibold block text-white">TLS 1.3 Secure Layer</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-teal-300 font-bold uppercase block tracking-widest">Audit Trails</span>
                <span className="text-xs font-semibold block text-white">Non-Delete Table Policy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-slate-800 pb-8">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="MediRecord Logo" className="h-8 w-auto object-contain brightness-0 invert" />
                <span className="text-sm font-extrabold text-white tracking-tight">MediRecord</span>
              </div>
              <p className="text-[11px] leading-relaxed max-w-sm">
                Alfonso Ponce Enrile Memorial District Hospital (APEMDH) <br />
                Gonzaga, Cagayan Valley, Philippines
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Registry Portal</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <Link href="/login" className="hover:text-teal-400 transition-colors">Portal Login</Link>
                </li>
                <li>
                  <a href="#about" className="hover:text-teal-400 transition-colors">Hospital About</a>
                </li>
                <li>
                  <a href="#features" className="hover:text-teal-400 transition-colors">Features List</a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Support Contact</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>APEMDH IT Administration</li>
                <li>Email: medicalsystem976@gmail.com</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
            <span>
              &copy; {new Date().getFullYear()} APEMDH MediRecord. All Rights Reserved.
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
                DPA (RA 10173) Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL: Unified Request Certificate Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={resetModal}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-10 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-teal-600 mx-auto" />
                <h3 className="text-2xl font-black text-slate-900">Request Submitted</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Your request for a {docType === 'BIRTH' ? 'Birth Certificate' : 'Death Certificate'} has been routed to the APEMDH Medical Records Officer. Updates will be sent to your email.
                </p>
                <button
                  onClick={resetModal}
                  className="mt-4 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Request Civil Registry Record</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select certificate type and supply necessary verifications for APEMDH processing.
                  </p>
                </div>

                {/* Document Type Selector Toggle */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1.5">Document Type *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('BIRTH');
                        setFormData((prev) => ({ ...prev, relationship: 'Parent' }));
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        docType === 'BIRTH'
                          ? 'bg-white text-teal-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Certificate of Live Birth
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDocType('DEATH');
                        setFormData((prev) => ({ ...prev, relationship: 'Spouse' }));
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        docType === 'DEATH'
                          ? 'bg-white text-teal-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Certificate of Death
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Subject Name (First, Middle, Last) */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {docType === 'BIRTH' ? 'Child Full Name *' : 'Deceased Full Name *'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        required
                        type="text"
                        name="subjectFirstName"
                        value={formData.subjectFirstName}
                        onChange={handleInputChange}
                        placeholder="First Name *"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                      <input
                        type="text"
                        name="subjectMiddleName"
                        value={formData.subjectMiddleName}
                        onChange={handleInputChange}
                        placeholder="Middle Name"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                      <input
                        required
                        type="text"
                        name="subjectLastName"
                        value={formData.subjectLastName}
                        onChange={handleInputChange}
                        placeholder="Last Name *"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    {/* Real-time Record Verification Indicator */}
                    <div className="mt-2 text-xs">
                      {verificationStatus === 'loading' && (
                        <div className="flex items-center gap-1.5 text-slate-500 animate-pulse">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                          <span>Verifying record availability in hospital database...</span>
                        </div>
                      )}

                      {verificationStatus === 'found' && (
                        <div className="flex flex-col gap-1 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Record Exists in APEMDH Registry Database</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 leading-tight">
                            Ref No: <span className="font-semibold">{matchedRecord?.certificate_number}</span> | Date of Event:{' '}
                            <span className="font-semibold">
                              {docType === 'BIRTH' ? matchedRecord?.birth_date : matchedRecord?.date_of_death}
                            </span>
                          </p>
                        </div>
                      )}

                      {verificationStatus === 'not_found' && (
                        <div className="flex items-center gap-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-[11px] leading-tight">
                            No direct match found in digital hospital records. Request will require manual archival lookup.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Date */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {docType === 'BIRTH' ? 'Date of Birth *' : 'Date of Death *'}
                    </label>
                    <input
                      required
                      type="date"
                      name="dateOfEvent"
                      value={formData.dateOfEvent}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>

                  {/* Requester Name (First, Middle, Last) */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name of Requester *</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        required
                        type="text"
                        name="requesterFirstName"
                        value={formData.requesterFirstName}
                        onChange={handleInputChange}
                        placeholder="First Name *"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                      <input
                        type="text"
                        name="requesterMiddleName"
                        value={formData.requesterMiddleName}
                        onChange={handleInputChange}
                        placeholder="Middle Name"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                      <input
                        required
                        type="text"
                        name="requesterLastName"
                        value={formData.requesterLastName}
                        onChange={handleInputChange}
                        placeholder="Last Name *"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Relationship to Subject *</label>
                    <select
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    >
                      {docType === 'BIRTH' ? (
                        <>
                          <option value="Parent">Parent</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Non-Relative">Non-Relative (Authorized Representative)</option>
                        </>
                      ) : (
                        <>
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Non-Relative">Non-Relative (Authorized Representative)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Birth Specific Conditionals */}
                  {docType === 'BIRTH' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Parents Married? *</label>
                        <select
                          name="isMarried"
                          value={formData.isMarried}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mother under 18 years old? *</label>
                        <select
                          name="isMotherUnder18"
                          value={formData.isMotherUnder18}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Document Attachments Panel */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">Required Document Attachments</span>

                    {/* Birth Conditional Files */}
                    {docType === 'BIRTH' && formData.isMarried === 'yes' && (
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Marriage Certificate *</label>
                        <input
                          required
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setMarriageCert(e.target.files?.[0] || null)}
                          className="w-full text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                        />
                      </div>
                    )}

                    {docType === 'BIRTH' && formData.isMarried === 'no' && (
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Valid ID of Both Parents *</label>
                        <input
                          required
                          multiple
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setParentIds(e.target.files)}
                          className="w-full text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                        />
                      </div>
                    )}

                    {docType === 'BIRTH' && formData.isMotherUnder18 === 'yes' && (
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Valid ID of Her Parents (Grandparents) *</label>
                        <input
                          required
                          multiple
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setGrandparentIds(e.target.files)}
                          className="w-full text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                        />
                      </div>
                    )}

                    {/* Death Conditional Files */}
                    {docType === 'DEATH' && (
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Valid ID of Requester *</label>
                        <input
                          required
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setRequesterId(e.target.files?.[0] || null)}
                          className="w-full text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                        />
                      </div>
                    )}

                    {/* Authorization Letter for Non-Relatives */}
                    {formData.relationship === 'Non-Relative' && (
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Signed Authorization Letter *</label>
                        <input
                          required
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setAuthLetter(e.target.files?.[0] || null)}
                          className="w-full text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                        />
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                      <input
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="you@domain.com"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Contact Number *</label>
                      <input
                        required
                        type="tel"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        placeholder="09123456789"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Purpose of Request *</label>
                    <textarea
                      required
                      rows={2}
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      placeholder="e.g. Legal, Claims, School Registration, Estate Settlement"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {isSubmitting ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}