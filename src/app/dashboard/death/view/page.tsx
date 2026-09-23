'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getDeathRecordsAction,
  submitDeathToPhysicianAction,
  certifyDeathRecordAction,
  verifyDeathRecordAction,
  approveDeathRecordAction,
  finalizeLCRDeathAction,
  uploadDeathFileAction,
  getCertifierDetailsAction,
} from '@/app/actions/death';
import { DeathRecord } from '@/lib/types';
import {
  ShieldCheck,
  Download,
  X,
  FileCheck,
  Archive,
  UploadCloud,
  Loader2,
  ArrowLeft,
  Eye,
  Printer,
  ArrowRight,
  FileText,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DeathRecordDetailsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const recordId = searchParams.get('id');

  const [record, setRecord] = useState<DeathRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);

  // Physician inputs for certification stage
  const [causeInput, setCauseInput] = useState('');
  const [icd10Input, setIcd10Input] = useState('');
  
  const [creatorDetails, setCreatorDetails] = useState<{
    titlePosition: string;
    address: string;
  }>({ titlePosition: '', address: '' });

  const [certifierDetails, setCertifierDetails] = useState<{
    titlePosition: string;
    address: string;
  }>({ titlePosition: '', address: '' });

  const [submitterDetails, setSubmitterDetails] = useState<{
    titlePosition: string;
    address: string;
  }>({ titlePosition: '', address: '' });

  // State for Approver details
  const [approverDetails, setApproverDetails] = useState<{
    titlePosition: string;
    address: string;
  }>({ titlePosition: '', address: '' });

  useEffect(() => {
    if (!record?.approvedBy) return;

    // Fetch details strictly using record.approvedBy
    getCertifierDetailsAction(record.approvedBy).then(setApproverDetails);
  }, [record?.approvedBy]);

  useEffect(() => {
    if (!record?.submittedBy) return;

    getCertifierDetailsAction(record.submittedBy).then(setSubmitterDetails);
  }, [record?.submittedBy]);

  useEffect(() => {
    if (!record?.certifiedBy) return;

    getCertifierDetailsAction(record.certifiedBy).then(setCertifierDetails);
  }, [record?.certifiedBy]);

  useEffect(() => {
    if (!record?.createdBy) return;

    getCertifierDetailsAction(record.createdBy).then(setCreatorDetails);
  }, [record?.createdBy]);

  const fetchRecord = async () => {
    if (!recordId) return;
    try {
      setLoading(true);
      const res = await getDeathRecordsAction('', 'ALL');
      const found = res.find((r) => r.id === recordId);
      if (found) {
        setRecord(found);
        setCauseInput(found.causeOfDeath || '');
        setIcd10Input(found.icd10Code || '');
      } else {
        toast.error('Death record not found.');
      }
    } catch {
      toast.error('Failed to retrieve death record details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchRecord();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const handleAction = async (actionFn: (id: string) => Promise<DeathRecord>, successMsg: string) => {
    if (!record) return;
    try {
      setActionLoading(true);
      const updated = await actionFn(record.id);
      setRecord(updated);
      toast.success(successMsg);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Workflow transition failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhysicianCertify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!causeInput || !icd10Input) {
      toast.error('Please enter both Cause of Death and ICD-10 Code.');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await certifyDeathRecordAction(record.id, causeInput, icd10Input);
      setRecord(updated);
      toast.success('Medical cause of death certified successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Certification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !record) return;

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', file);

      await uploadDeathFileAction(record.id, formData);
      toast.success('Supporting document uploaded.');
      fetchRecord();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'File upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const getMaternalConditionLabel = (condition?: string | null) => {
    switch (condition?.toLowerCase()) {
        case 'a':
        return 'a. pregnant, not in labour';
        case 'b':
        return 'b. pregnant, in labour';
        case 'c':
        return 'c. less than 42 days after delivery';
        case 'd':
        return 'd. 42 days to 1 year after delivery';
        case 'e':
        default:
        return 'e. None of the choices';
    }
  };

  const handleVerifyComplete = async () => {
    if (!record) return;
    try {
      setActionLoading(true);
      const updated = await verifyDeathRecordAction(record.id, record.supportingDocuments || []);
      setRecord(updated);
      toast.success('Verification completed and submitted to CRO.');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-rose-700 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Querying civil registry death record...</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <FileText className="h-12 w-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Record Not Found</h2>
        <p className="text-xs text-slate-500">
          No death certificate record matches the requested ID or parameter.
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-800"
        >
          <ArrowLeft className="h-4 w-4" /> Go back to Registry
        </button>
      </div>
    );
  }

  // Extract nested properties with flat field fallbacks
  const deceased = record.details?.deceased;
  const place = record.details?.placeOfDeath;
  const parents = record.details?.parents;
  const causes = record.details?.causesOfDeath;
  const attendant = record.details?.attendant;
  const informant = record.details?.informant;

  // Name Parsing
  const firstName = deceased?.firstName || record.deceasedName?.split(' ')[0] || '';
  const middleName = deceased?.middleName || '—';
  const lastName = deceased?.lastName || record.deceasedName?.split(' ').slice(1).join(' ') || '';

  // Dates Parsing
    const dobStr = deceased?.dateOfBirth 
    ? new Date(deceased.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) 
    : 'N/A';

    const dodStr = record.dateOfDeath 
    ? new Date(record.dateOfDeath).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) 
    : 'N/A';
  // Address String Helper
  const resObj = deceased?.residence;
  const residenceAddress = resObj 
    ? [resObj.barangay, resObj.city, resObj.province, resObj.country].filter(Boolean).join(', ') 
    : 'GONZAGA, CAGAYAN';

  const placeOfDeathStr = place 
    ? [place.hospital, place.barangay, place.city, place.province].filter(Boolean).join(', ') 
    : record.placeOfDeath;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-rose-700 transition-colors print:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Death Registry
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Form
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-100 rounded-full">
            Status: {record.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Official Form Template (Municipal Form No. 103) */}
      <div className="printable-form bg-white border-2 border-slate-900 p-4 md:p-6 text-slate-900 shadow-md uppercase font-serif text-[10px] leading-tight space-y-0.5 print:border-2 print:border-slate-900 print:p-4 print:shadow-none">

        <div className="text-center space-y-0.5 border-b-2 border-slate-900 pb-2 relative">
          <span className="absolute left-0 top-0 text-[10px] lowercase font-sans">
            Municipal Form No. 103<br />(Revised August 2016)
          </span>
          <span className="absolute right-0 top-0 text-[10px] lowercase font-sans">
            (To be accomplished in quadruplicate using black ink)
          </span>
          <p className="text-[11px] tracking-wide pt-4 sm:pt-0">Republic of the Philippines</p>
          <p className="text-[11px] font-bold">OFFICE OF THE CIVIL REGISTRAR GENERAL</p>
          <h1 className="text-xl font-extrabold tracking-wider py-1">CERTIFICATE OF DEATH</h1>
        </div>

        {/* Location & Registry No */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900 text-xs font-sans">
          <div className="col-span-8 border-r-2 border-slate-900 p-1.5 space-y-1">
            <div className="flex items-baseline">
              <span className="w-50 font-serif font-bold">Province:</span>
              <span className="font-bold text-sm underline tracking-widest">
                {place?.province || 'CAGAYAN'}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-50 font-serif font-bold">City/Municipality:</span>
              <span className="font-bold text-sm underline tracking-widest">
                {place?.city || 'GONZAGA'}
              </span>
            </div>
          </div>
          <div className="col-span-4 p-1.5 font-serif">
            <span className="block font-bold">Registry No.</span>
            <span className="font-sans font-bold text-sm tracking-wider block mt-1">
              {record.certificateNumber}
            </span>
          </div>
        </div>

        {/* Row 1 & 2: Name & Sex */}
        <div className="grid grid-cols-12 border-b border-slate-900 font-sans">
          <div className="col-span-9 border-r border-slate-900 p-1.5 space-y-1">
            <div className="text-[9px] font-bold text-slate-600">1. NAME (First) (Middle) (Last)</div>
            <div className="grid grid-cols-3 text-center font-bold text-sm py-1">
              <span>{firstName}</span>
              <span>{middleName}</span>
              <span>{lastName}</span>
            </div>
          </div>
          <div className="col-span-3 p-1.5 space-y-1">
            <div className="text-[9px] font-bold text-slate-600">2. SEX (Male/Female)</div>
            <div className="text-center font-bold text-sm py-1">{record.deceasedGender}</div>
          </div>
        </div>

        {/* Row 3, 4, 5: Death Date, Birth Date, Age */}
        <div className="grid grid-cols-12 border-b border-slate-900 font-sans">
          <div className="col-span-4 border-r border-slate-900 p-1.5">
            <div className="text-[9px] font-bold text-slate-600">3. DATE OF DEATH (Day, Month, Year)</div>
            <div className="text-center font-bold text-sm py-1">{dodStr}</div>
          </div>
          <div className="col-span-4 border-r border-slate-900 p-1.5">
            <div className="text-[9px] font-bold text-slate-600">4. DATE OF BIRTH (Day) (Month) (Year)</div>
            <div className="text-center font-bold text-sm py-1">{dobStr}</div>
          </div>
          <div className="col-span-4 p-1.5">
            <div className="text-[9px] font-bold text-slate-600">5. AGE AT TIME OF DEATH</div>
            <div className="text-center font-bold text-sm py-0.5">{record.deceasedAge} yrs</div>
          </div>
        </div>

        {/* Row 6 & 7: Place of Death & Civil Status */}
        <div className="grid grid-cols-12 border-b border-slate-900 font-sans">
          <div className="col-span-9 border-r border-slate-900 p-2">
            <div className="text-[9px] font-bold text-slate-600">6. PLACE OF DEATH (Hospital/Clinic/Institution/House No., St., Barangay, City/Municipality, Province)</div>
            <div className="font-bold text-sm p-1 mx-10">{placeOfDeathStr}</div>
          </div>
          <div className="col-span-3 p-2">
            <div className="text-[9px] font-bold text-slate-600">7. CIVIL STATUS</div>
            <div className="text-center font-bold text-sm p-1">{deceased?.civilStatus || 'WIDOW'}</div>
          </div>
        </div>

        {/* Row 8, 9, 10: Religion, Citizenship, Residence */}
        <div className="grid grid-cols-12 border-b border-slate-900 font-sans">
          <div className="col-span-4 border-r border-slate-900 p-3">
            <div className="text-[9px] font-bold text-slate-600">8. RELIGION/RELIGIOUS SECT</div>
            <div className="font-bold text-sm p-1">{deceased?.religion || '—'}</div>
          </div>
          <div className="col-span-2 border-r border-slate-900 p-3">
            <div className="text-[9px] font-bold text-slate-600">9. CITIZENSHIP</div>
            <div className="font-bold text-sm p-1">{deceased?.citizenship || 'FILIPINO'}</div>
          </div>
          <div className="col-span-6 p-3">
            <div className="text-[9px] font-bold text-slate-600">10. RESIDENCE (House No., St., Barangay, City/Municipality, Province)</div>
            <div className="font-bold text-sm p-1">{residenceAddress}</div>
          </div>
        </div>

        {/* Row 11, 12, 13: Occupation & Parents */}
        <div className="grid grid-cols-12 border-b border-slate-900 font-sans">
          <div className="col-span-4 border-r border-slate-900 p-3">
            <div className="text-[9px] font-bold text-slate-600">11. OCCUPATION</div>
            <div className="font-bold text-sm p-1">{deceased?.occupation || 'HOUSEWIFE'}</div>
          </div>
          <div className="col-span-4 border-r border-slate-900 p-3">
            <div className="text-[9px] font-bold text-slate-600">12. NAME OF FATHER (First, Middle, Last)</div>
            <div className="font-bold text-sm p-1">
              {parents?.father ? `${parents.father.firstName} ${parents.father.middleName || ''} ${parents.father.lastName}` : '—'}
            </div>
          </div>
          <div className="col-span-4 p-3">
            <div className="text-[9px] font-bold text-slate-600">13. MAIDEN NAME OF MOTHER (First, Middle, Last)</div>
            <div className="font-bold text-sm p-1">
              {parents?.mother ? `${parents.mother.firstName} ${parents.mother.middleName || ''} ${parents.mother.lastName}` : '—'}
            </div>
          </div>
        </div>

        {/* Section Header: Medical Certificate */}
        <div className="text-center p-2 font-sans border-b border-slate-900">
          <span className='font-bold text-base'>MEDICAL CERTIFICATE</span> <br />
          (For age 0 to 7 days, accomplish items 14-19a at the back)
        </div>

        {/* Row 19b: Causes of Death */}
        <div className="border-b border-slate-900 p-3 font-sans space-y-1">
          <div className="text-[10px] p-1 font-bold text-slate-600">19b. CAUSES OF DEATH</div>
          <div className="grid grid-cols-12 gap-2 text-xs">
            <div className="col-span-8 space-y-1">
              <div className="flex gap-2">
                <span className="font-bold w-35">I. Immediate cause:</span>
                <span className="font-bold border-b border-slate-300 flex-1 text-sm">{causes?.immediateCause || record.causeOfDeath || 'ACUTE RESPIRATORY FAILURE'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold w-35">Antecedent cause:</span>
                <span className="font-bold border-b border-slate-300 flex-1 text-sm">{causes?.antecedentCause || 'CONGESTIVE HEART FAILURE'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold w-35">Underlying cause:</span>
                <span className="font-bold border-b border-slate-300 flex-1 text-sm">{causes?.underlyingCause || 'None'}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <span className="font-bold w-35">II. Other conditions:</span>
                <span className="font-bold border-b border-slate-300 flex-1 text-sm">{causes?.otherConditions || 'None'}</span>
              </div>
            </div>
            <div className="col-span-4 border-l border-slate-900 p-2 space-y-2">
                <div className="text-[10px] font-bold text-slate-600">WHO ICD-10 Code</div>
                    <div className={`text-center font-bold text-sm p-2 rounded border ${
                        record.icd10Code 
                        ? 'bg-rose-50 text-rose-800 border-rose-200 text-sm' 
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                        {record.icd10Code || 'PENDING'}
                    </div>
                </div>
          </div>
        </div>

        {/* Row 19c, 19d, 20: Maternal, External Causes, Autopsy */}
        <div className="grid grid-cols-12 border-b border-slate-900 font-sans">
          <div className="col-span-12 border-b border-slate-900 p-3 space-y-1">
            <span className="text-slate-600 font-bold block text-[10px]">
              19c. MATERNAL CONDITION <span className='lowercase'>(If the deceased is female aged 15-49 years old)</span>
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
              <div className="font-bold">
                <span className="font-bold text-sm">
                  {record.details?.maternalCondition === 'a' || record.details?.maternalCondition === 'pregnant_not_in_labour' ? '(✓)' : '(_)'}
                </span>{' '}
                a. Pregnant, not in labour
              </div>
              <div className="font-bold">
                <span className="font-bold text-sm">
                  {record.details?.maternalCondition === 'b' || record.details?.maternalCondition === 'pregnant_in_labour' ? '(✓)' : '(_)'}
                </span>{' '}
                b. Pregnant, in labour
              </div>
              <div className="font-bold">
                <span className="font-bold text-sm">
                  {record.details?.maternalCondition === 'c' || record.details?.maternalCondition === 'less_than_42_days' ? '(✓)' : '(_)'}
                </span>{' '}
                c. Less than 42 days after delivery
              </div>
              <div className="font-bold">
                <span className="font-bold text-sm">
                  {record.details?.maternalCondition === 'd' || record.details?.maternalCondition === '42_days_to_1_year' ? '(✓)' : '(_)'}
                </span>{' '}
                d. 42 days to 1 year after delivery
              </div>
              <div className="col-span-2 font-bold">
                <span className="font-bold text-sm">
                  {record.details?.maternalCondition === 'e' || record.details?.maternalCondition === 'none' || !record.details?.maternalCondition ? '(✓)' : '(_)'}
                </span>{' '}
                e. None of the choices
              </div>
            </div>
          </div>
          <div className="col-span-10 border-slate-900 p-3 space-y-1">
            <span className="font-bold text-slate-600 pb-3 block text-[10px]">
              19d. DEATH BY EXTERNAL CAUSES
            </span>
            <div className="text-sm">
              <div>
                <span className="font-semibold">a. Manner of death <span className='lowercase me-11 font-normal'>(Homicide, Suicide, etc.)</span></span>{' '}
                <span className="border-b border-slate-900 px-2 font-bold inline-block min-w-[150px]">
                  {record.details?.externalCauses?.mannerOfDeath || 'Not Applicable'}
                </span>
              </div>
              <div>
                <span className="font-semibold me-3">b. Place of Occurrence of External cause</span>{' '}
                <span className="border-b border-slate-900 px-2 font-bold inline-block min-w-[150px]">
                  {record.details?.externalCauses?.placeOfOccurrence || 'Not Applicable'}
                </span>
              </div>
            </div>
          </div>
          <div className="col-span-2 p-3 border-slate-900 border-l space-y-1 text-center">
            <span className="font-bold text-slate-600 block pb-4 text-[10px]">20. AUTOPSY</span>
            <span className="font-bold text-sm">{record.details?.autopsy || 'NO'}</span>
          </div>
        </div>

        {/* Row 22: Certification of Death */}
        <div className="border-b border-slate-900 p-2 font-sans text-slate-900 leading-tight">
          <div className="p-1 border-slate-900">
            <span className="font-bold block m-1 text-slate-600 mx-2 text-[10px]">22. CERTIFICATION OF DEATH</span>
            <div className="flex items-start gap-1 flex-wrap pl-2 text-xs lowercase">
              <span><span className='uppercase mx-4'>I</span>hereby certify that the foregoing particulars are correct as near as same can be ascertained and I further certify that I have attended/have not attended the deceased and that death occurred on the date and time of death specified above.</span>
            </div>
          </div>

          <div className="grid grid-cols-12">
            {/* Left Column: Certifier Details */}
            <div className="col-span-7 p-1 space-y-1">
              {/* <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Signature</span>
                <div className="flex-1 border-b border-slate-900 min-h-[14px]"></div>
              </div> */}
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Name in Print</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {record.certifiedBy || 'Not Certified yet'}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Title or Position</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {certifierDetails.titlePosition || ''}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Address</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {certifierDetails.address || ''}
                </span>
              </div>
              <div className="flex justify-end">
                <span className="w-24 text-xs capitalize">Date</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {record.certifiedAt 
                    ? new Date(record.certifiedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : ''}
                </span>
              </div>
            </div>

            {/* Right Column: Reviewed By Section */}
            <div className="col-span-5 border border-slate-900 p-2 m-1 flex flex-col justify-between">
              <div>
                <span className="font-bold block text-slate-600 text-xs">REVIEWED BY:</span>
                <div className="text-center mt-3">
                  <span className="font-bold text-sm uppercase block">
                    {record.verifiedBy || 'Not verified yet'}
                  </span>
                  <div className="border-t border-slate-900 mt-1 mx-auto min-h-[12px] w-3/4 pt-0.5 text-[8px] text-slate-700">
                    Signature Over Printed Name of Health Officer
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-900 mx-auto w-3/4 min-h-[12px]">
                  <span className="font-bold">
                    {record.verifiedAt
                      ? new Date(record.verifiedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : ''}
                  </span>
                </div>
                <span className="text-[8px] text-slate-700 block">Date</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 26 & 27: Informant & Prepared By */}
        <div className="grid grid-cols-12 border-b border-slate-900 font-sans">
          
          {/* Left Column: 26. CERTIFICATION OF INFORMANT */}
          <div className="col-span-6 border-r border-slate-900 p-2 space-y-2">
            <span className="text-[10px] font-bold text-slate-600 block">26. CERTIFICATION OF INFORMANT</span>
            <div className="space-y-1">
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Name:</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {informant?.name || ''}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Relationship:</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {informant?.relationship || ''}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Address:</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm truncate">
                  {informant?.address ? `${informant.address.barangay || ''}, ${informant.address.city || ''}, ${informant.address.province || ''}` : ''}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Date:</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {record.createdAt
                    ? new Date(record.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: 27. PREPARED BY */}
          <div className="col-span-6 p-2 space-y-2 font-sans">
            <span className="text-[9px] font-bold text-slate-600 block">27. PREPARED BY</span>
            <div className="space-y-1">
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Name in Print</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {record.createdBy || ''}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Title or Position</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {creatorDetails.titlePosition || 'MEDICAL RECORDS OFFICER'}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Address</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {creatorDetails.address || 'APEMDH, GONZAGA, CAGAYAN'}
                </span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-xs capitalize">Date:</span>
                <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                  {record.createdAt
                    ? new Date(record.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : ''}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Row 28 & 29: Received & Registered */}
        <div className="grid grid-cols-12 font-sans pt-1">
          {/* 28. RECEIVED BY */}
          <div className="col-span-6 p-2 space-y-2">
            <span className="text-[9px] font-bold text-slate-600 block">28. RECEIVED BY</span>
            <div>
              <div className="col-span-7 p-1 space-y-1">
                <div className="flex items-end">
                  <span className="w-24 text-xs capitalize">Name in Print</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {record.approvedBy || 'Not submitted yet'}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-24 text-xs capitalize">Title or Position</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {approverDetails.titlePosition || ''}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-24 text-xs capitalize">Address</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {approverDetails.address || ''}
                  </span>
                </div>
                <div className="flex justify-end">
                  <span className="w-24 text-xs capitalize">Date</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {record.approvedAt
                      ? new Date(record.approvedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 29. REGISTERED AT THE OFFICE OF THE CIVIL REGISTRAR */}
          <div className="col-span-6 p-2 space-y-2 border-l border-slate-900">
            <span className="text-[9px] font-bold text-slate-600 block">
              29. REGISTERED AT THE OFFICE OF THE CIVIL REGISTRAR
            </span>
            <div>
              <div className="col-span-7 p-1 space-y-1">
                <div className="flex items-end">
                  <span className="w-24 text-xs capitalize">Name in Print</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {record.submittedBy || 'Not archived yet'}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-24 text-xs capitalize">Title or Position</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {submitterDetails.titlePosition || ''}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-24 text-xs capitalize">Address</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {submitterDetails.address || ''}
                  </span>
                </div>
                <div className="flex justify-end">
                  <span className="w-24 text-xs capitalize">Date</span>
                  <span className="flex-1 border-b border-slate-900 font-bold px-1 text-center uppercase text-sm">
                    {record.submittedAt
                      ? new Date(record.submittedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Supporting Documents Block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs print:hidden space-y-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Supporting Attachments</h2>

        {record.supportingDocuments.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No supporting files attached to this record.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {record.supportingDocuments.map((doc, idx) => {
              const isCombined = doc.includes('|');
              const displayName = isCombined ? doc.split('|')[0] : doc;
              const downloadUrl = isCombined ? doc.split('|')[1] : (doc.startsWith('http') || doc.startsWith('/') ? doc : `/uploads/${doc}`);
              return (
                <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50 rounded-xl text-xs font-semibold">
                  <span className="text-slate-700 truncate max-w-[160px]">{displayName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewFile({ name: displayName, url: downloadUrl })}
                      className="text-rose-700 hover:text-rose-800 p-1 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <a
                      href={downloadUrl}
                      download={displayName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 hover:text-teal-800 p-1 flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload File Input for MRO / Admin in PENDING_VERIFICATION */}
        {record.status === 'PENDING_VERIFICATION' && (user?.role === 'MRO' || user?.role === 'ADMIN') && (
          <div className="pt-2">
            <label className="border-2 border-dashed border-slate-200 hover:border-rose-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 transition-colors">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadingDoc}
                accept=".pdf,.png,.jpg,.jpeg"
              />
              {uploadingDoc ? (
                <Loader2 className="h-6 w-6 text-rose-600 animate-spin" />
              ) : (
                <UploadCloud className="h-6 w-6 text-slate-400" />
              )}
              <span className="text-xs text-slate-700 font-bold">
                {uploadingDoc ? 'Uploading...' : 'Attach File (PDF, PNG, JPG)'}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Role-Based Workflow Actions */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs print:hidden">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Workflow Actions</h2>

        {actionLoading ? (
          <div className="flex items-center justify-center py-4 gap-2 text-rose-700 font-bold text-xs">
            <Loader2 className="h-5 w-5 animate-spin" /> Processing request...
          </div>
        ) : (
          <div className="space-y-3">
            {record.status === 'DRAFT' && (user?.role === 'MRO' || user?.role === 'ADMIN') && (
              <button
                onClick={() => handleAction(submitDeathToPhysicianAction, 'Record submitted to physician for diagnosis certification.')}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Submit to Physician for Medical Cert</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {record.status === 'PENDING_CERTIFICATION' && (user?.role === 'PHYSICIAN' || user?.role === 'ADMIN') && (
              <form onSubmit={handlePhysicianCertify} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Attending Cause of Death Certificate *</label>
                  <input
                    type="text"
                    value={causeInput}
                    onChange={(e) => setCauseInput(e.target.value)}
                    placeholder="e.g. Acute Respiratory Failure"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">WHO Classification Code (ICD-10) *</label>
                  <input
                    type="text"
                    value={icd10Input}
                    onChange={(e) => setIcd10Input(e.target.value)}
                    placeholder="e.g. J96.9"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Stethoscope className="h-4 w-4" />
                  <span>Certify & Submit to Records Officer</span>
                </button>
              </form>
            )}

            {record.status === 'PENDING_VERIFICATION' && (user?.role === 'MRO' || user?.role === 'ADMIN') && (
              <button
                onClick={handleVerifyComplete}
                disabled={uploadingDoc}
                className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                <FileCheck className="h-4 w-4" />
                <span>Complete Verification & Submit to CRO</span>
              </button>
            )}

            {record.status === 'PENDING_APPROVAL' && (user?.role === 'CRO' || user?.role === 'ADMIN') && (
              <button
                onClick={() => handleAction(approveDeathRecordAction, 'Death certificate approved and dispatched to Local Civil Registrar.')}
                className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Approve & Submit to Local Registrar</span>
              </button>
            )}

            {record.status === 'SUBMITTED_LCR' && (user?.role === 'LCR' || user?.role === 'ADMIN') && (
              <button
                onClick={() => handleAction(finalizeLCRDeathAction, 'Civil registry finalized and record locked in Archives.')}
                className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Archive className="h-4 w-4" />
                <span>Finalize, Register & Archive Record</span>
              </button>
            )}

            {record.status !== 'ARCHIVED' && (
              <p className="text-[11px] text-slate-500 text-center">
                Current stage requires action from authorized{' '}
                <span className="font-bold text-slate-700">
                  {record.status === 'DRAFT'
                    ? 'MRO'
                    : record.status === 'PENDING_CERTIFICATION'
                    ? 'Physician'
                    : record.status === 'PENDING_VERIFICATION'
                    ? 'MRO'
                    : record.status === 'PENDING_APPROVAL'
                    ? 'CRO'
                    : 'LCR'}
                </span>{' '}
                personnel.
              </p>
            )}

            {record.status === 'ARCHIVED' && (
              <div className="p-3 bg-green-100/70 border border-green-200 rounded-xl text-center text-xs text-green-800 font-semibold">
                This civil registry document is fully finalized and archived. No further actions are required.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-xs truncate max-w-md">{previewFile.name}</span>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50 min-h-[300px] flex items-center justify-center">
              {previewFile.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewFile.url} alt="Document preview" className="max-w-full max-h-[60vh] object-contain rounded-lg" />
              ) : (
                <iframe src={previewFile.url} className="w-full h-[60vh] rounded-lg border-none" title="Document Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}