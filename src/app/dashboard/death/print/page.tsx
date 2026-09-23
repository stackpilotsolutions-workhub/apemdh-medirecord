'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDeathRecordsAction, getCertifierDetailsAction } from '@/app/actions/death';
import { DeathRecord } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function DeathRecordPrintPage() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get('id');

  const [record, setRecord] = useState<DeathRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [creatorDetails, setCreatorDetails] = useState({ titlePosition: '', address: '' });
  const [certifierDetails, setCertifierDetails] = useState({ titlePosition: '', address: '' });
  const [verifierDetails, setVerifierDetails] = useState({ titlePosition: '', address: '' });
  const [submitterDetails, setSubmitterDetails] = useState({ titlePosition: '', address: '' });
  const [approverDetails, setApproverDetails] = useState({ titlePosition: '', address: '' });

  useEffect(() => {
    if (!recordId) return;
    const fetchRecord = async () => {
      try {
        setLoading(true);
        const res = await getDeathRecordsAction('', 'ALL');
        const found = res.find((r) => r.id === recordId);
        if (found) setRecord(found);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId]);

  useEffect(() => {
    if (!record) return;
    if (record.approvedBy) {
      getCertifierDetailsAction(record.approvedBy)
        .then(res => setApproverDetails(res || { titlePosition: 'MUNICIPAL MAYOR / LCR', address: 'GONZAGA, CAGAYAN' }));
    }
    if (record.submittedBy) {
      getCertifierDetailsAction(record.submittedBy)
        .then(res => setSubmitterDetails(res || { titlePosition: 'CIVIL REGISTRATION OFFICER', address: 'GONZAGA, CAGAYAN' }));
    }
    if (record.certifiedBy) {
      getCertifierDetailsAction(record.certifiedBy)
        .then(res => setCertifierDetails(res || { titlePosition: 'ATTENDING PHYSICIAN', address: 'APEMDH, GONZAGA, CAGAYAN' }));
    }
    if (record.verifiedBy) {
      getCertifierDetailsAction(record.verifiedBy)
        .then(res => setVerifierDetails(res || { titlePosition: 'RURAL HEALTH OFFICER', address: 'RHU GONZAGA, CAGAYAN' }));
    }
    if (record.createdBy) {
      getCertifierDetailsAction(record.createdBy)
        .then(res => setCreatorDetails(res || { titlePosition: 'MEDICAL RECORDS OFFICER', address: 'APEMDH, GONZAGA, CAGAYAN' }));
    }
  }, [record]);

  useEffect(() => {
    if (!record || loading) return;
    const timer = setTimeout(() => { window.print(); }, 600);
    const handleAfterPrint = () => { window.close(); };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [record, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-white font-sans">
        <Loader2 className="h-8 w-8 text-rose-700 animate-spin" />
        <span className="text-xs text-slate-500 font-semibold">Preparing official print document...</span>
      </div>
    );
  }

  if (!record) return <div className="p-8 text-center text-xs font-sans text-slate-600">Death record not found.</div>;

  const deceased = record.details?.deceased;
  const place = record.details?.placeOfDeath;
  const parents = record.details?.parents;
  const causes = record.details?.causesOfDeath;
  const informant = record.details?.informant;

  const firstName = deceased?.firstName || record.deceasedName?.split(' ')[0] || '';
  const middleName = deceased?.middleName || '—';
  const lastName = deceased?.lastName || record.deceasedName?.split(' ').slice(1).join(' ') || '';

  const dobStr = deceased?.dateOfBirth
    ? new Date(deceased.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  const dodStr = record.dateOfDeath
    ? new Date(record.dateOfDeath).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  const resObj = deceased?.residence;
  const residenceAddress = resObj
    ? [resObj.barangay, resObj.city, resObj.province, resObj.country].filter(Boolean).join(', ')
    : 'GONZAGA, CAGAYAN';

  const placeOfDeathStr = place
    ? [place.hospital, place.barangay, place.city, place.province].filter(Boolean).join(', ')
    : record.placeOfDeath;

  return (
    <div className="bg-white text-black min-h-screen print:min-h-0 print:m-0 print:p-0">
      <style>{`
        @page {
          size: 8.5in 13in;
          margin: 0mm !important;
        }
        @media print {
          html, body {
            width: 8.5in;
            height: 13in;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          header, nav, sidebar, footer, .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Container calibrated to fit strictly inside 8.5 x 13 inches page */}
      <div className="w-[8.5in] h-[12.8in] p-4 mx-auto box-border flex flex-col print:w-full print:h-[13in] print:p-5">
        
        {/* Form Outer Frame */}
        <div className="w-full h-full border-2 border-black flex flex-col justify-between uppercase font-serif text-[10px] leading-tight">
          
          {/* Header */}
          <div className="text-center space-y-0.5 border-b-2 border-black pb-1 pt-1 relative px-2 shrink-0">
            <span className="absolute left-2 top-1 text-[8px] lowercase font-sans text-left leading-tight">
              Municipal Form No. 103<br />(Revised August 2016)
            </span>
            <span className="absolute right-2 top-1 text-[8px] lowercase font-sans text-right leading-tight">
              (To be accomplished in quadruplicate using black ink)
            </span>
            <p className="text-[10px] tracking-wide pt-3">Republic of the Philippines</p>
            <p className="text-[10px] font-bold">OFFICE OF THE CIVIL REGISTRAR GENERAL</p>
            <h1 className="text-lg font-extrabold tracking-wider py-0.5 font-sans">CERTIFICATE OF DEATH</h1>
          </div>

          {/* Location & Registry No */}
          <div className="grid grid-cols-12 border-b-2 border-black font-sans text-xs flex-1">
            <div className="col-span-8 border-r-2 border-black p-1.5 flex flex-col justify-center space-y-0.5">
              <div className="flex items-baseline">
                <span className="w-32 font-serif font-bold text-[10px]">PROVINCE:</span>
                <span className="font-bold text-xs underline tracking-widest">{place?.province || 'CAGAYAN'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-32 font-serif font-bold text-[10px]">CITY/MUNICIPALITY:</span>
                <span className="font-bold text-xs underline tracking-widest">{place?.city || 'GONZAGA'}</span>
              </div>
            </div>
            <div className="col-span-4 p-1.5 font-serif flex flex-col justify-center">
              <span className="block font-bold text-[9px]">REGISTRY NO.</span>
              <span className="font-sans font-bold text-xs tracking-wider block mt-0.5">{record?.certificateNumber}</span>
            </div>
          </div>

          {/* 1 & 2: Name & Sex */}
          <div className="grid grid-cols-12 border-b border-black font-sans flex-1">
            <div className="col-span-9 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">1. NAME (First) (Middle) (Last)</div>
              <div className="grid grid-cols-3 text-center font-bold text-xs pb-0.5">
                <span>{firstName}</span>
                <span>{middleName}</span>
                <span>{lastName}</span>
              </div>
            </div>
            <div className="col-span-3 p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">2. SEX (Male/Female)</div>
              <div className="text-center font-bold text-xs pb-0.5">{record?.deceasedGender}</div>
            </div>
          </div>

          {/* 3, 4, 5: Death Date, Birth Date, Age */}
          <div className="grid grid-cols-12 border-b border-black font-sans flex-1">
            <div className="col-span-4 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">3. DATE OF DEATH (Day, Month, Year)</div>
              <div className="text-center font-bold text-xs pb-0.5">{dodStr}</div>
            </div>
            <div className="col-span-4 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">4. DATE OF BIRTH (Day) (Month) (Year)</div>
              <div className="text-center font-bold text-xs pb-0.5">{dobStr}</div>
            </div>
            <div className="col-span-4 p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">5. AGE AT TIME OF DEATH</div>
              <div className="text-center font-bold text-xs pb-0.5">{record?.deceasedAge} YRS</div>
            </div>
          </div>

          {/* 6 & 7: Place of Death & Civil Status */}
          <div className="grid grid-cols-12 border-b border-black font-sans flex-1">
            <div className="col-span-9 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">6. PLACE OF DEATH</div>
              <div className="font-bold text-xs text-center pb-0.5">{placeOfDeathStr}</div>
            </div>
            <div className="col-span-3 p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">7. CIVIL STATUS</div>
              <div className="text-center font-bold text-xs pb-0.5">{deceased?.civilStatus || 'WIDOWED'}</div>
            </div>
          </div>

          {/* 8, 9, 10: Religion, Citizenship, Residence */}
          <div className="grid grid-cols-12 border-b border-black font-sans flex-1">
            <div className="col-span-4 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">8. RELIGION</div>
              <div className="font-bold text-xs pb-0.5">{deceased?.religion || '—'}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">9. CITIZENSHIP</div>
              <div className="font-bold text-xs pb-0.5">{deceased?.citizenship || 'FILIPINO'}</div>
            </div>
            <div className="col-span-6 p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">10. RESIDENCE</div>
              <div className="font-bold text-xs pb-0.5">{residenceAddress}</div>
            </div>
          </div>

          {/* 11, 12, 13: Occupation & Parents */}
          <div className="grid grid-cols-12 border-b border-black font-sans flex-1">
            <div className="col-span-4 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">11. OCCUPATION</div>
              <div className="font-bold text-xs pb-0.5">{deceased?.occupation || 'HOUSEWIFE'}</div>
            </div>
            <div className="col-span-4 border-r border-black p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">12. NAME OF FATHER</div>
              <div className="font-bold text-xs pb-0.5">
                {parents?.father ? `${parents.father.firstName} ${parents.father.middleName || ''} ${parents.father.lastName}` : 'NARSICO DIKO CORNELIO'}
              </div>
            </div>
            <div className="col-span-4 p-1 flex flex-col justify-between">
              <div className="text-[8px] font-bold text-slate-700">13. MAIDEN NAME OF MOTHER</div>
              <div className="font-bold text-xs pb-0.5">
                {parents?.mother ? `${parents.mother.firstName} ${parents.mother.middleName || ''} ${parents.mother.lastName}` : 'ANTONIA DIMO FELIPE'}
              </div>
            </div>
          </div>

          {/* Medical Certificate Banner */}
          <div className="text-center p-1 font-sans border-b border-black bg-slate-50 shrink-0">
            <span className="font-bold text-xs tracking-wider">MEDICAL CERTIFICATE</span><br />
            <span className="text-[8px] text-slate-600">(For age 0 to 7 days, accomplish items 14-19a at the back)</span>
          </div>

          {/* 19b: Causes of Death */}
          <div className="border-b border-black p-1.5 font-sans flex-[1.5] flex flex-col justify-between">
            <div className="text-[8px] font-bold text-slate-700">19b. CAUSES OF DEATH</div>
            <div className="grid grid-cols-12 gap-2 text-xs my-auto">
              <div className="col-span-8 space-y-0.5">
                <div className="flex gap-1 items-end"><span className="font-bold w-32 text-[9px]">I. IMMEDIATE CAUSE:</span><span className="font-bold border-b border-black flex-1 text-[10px]">{causes?.immediateCause || record?.causeOfDeath || 'ACUTE RESPIRATORY FAILURE'}</span></div>
                <div className="flex gap-1 items-end"><span className="font-bold w-32 text-[9px]">ANTECEDENT CAUSE:</span><span className="font-bold border-b border-black flex-1 text-[10px]">{causes?.antecedentCause || 'CONGESTIVE HEART FAILURE'}</span></div>
                <div className="flex gap-1 items-end"><span className="font-bold w-32 text-[9px]">UNDERLYING CAUSE:</span><span className="font-bold border-b border-black flex-1 text-[10px]">{causes?.underlyingCause || 'NONE'}</span></div>
                <div className="flex gap-1 items-end"><span className="font-bold w-32 text-[9px]">II. OTHER CONDITIONS:</span><span className="font-bold border-b border-black flex-1 text-[10px]">{causes?.otherConditions || 'NONE'}</span></div>
              </div>
              <div className="col-span-4 border border-black p-1 text-center flex flex-col justify-center bg-slate-50">
                <div className="text-[8px] font-bold text-slate-700 mb-0.5">WHO ICD-10 CODE</div>
                <div className="font-bold text-xs">{record?.icd10Code || 'J95.821'}</div>
              </div>
            </div>
          </div>

          {/* 22: Certification of Death */}
          <div className="border-b border-black p-1.5 font-sans flex-[2] flex flex-col justify-between">
            <span className="font-bold block text-slate-700 text-[8px]">22. CERTIFICATION OF DEATH</span>
            <p className="text-[8px] lowercase leading-tight my-0.5">
              <span className="uppercase font-bold mr-1">I</span>hereby certify that the foregoing particulars are correct as near as same can be ascertained and I further certify that I have attended/have not attended the deceased and that death occurred on the date and time of death specified above.
            </p>

            <div className="grid grid-cols-12 gap-2 text-xs">
              <div className="col-span-7 space-y-0.5">
                <div className="flex items-end"><span className="w-20 text-[9px]">NAME IN PRINT:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.certifiedBy || 'DR. JACK CADAY'}</span></div>
                <div className="flex items-end"><span className="w-20 text-[9px]">TITLE/POSITION:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{certifierDetails.titlePosition || 'ATTENDING PHYSICIAN'}</span></div>
                <div className="flex items-end"><span className="w-20 text-[9px]">ADDRESS:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{certifierDetails.address || 'APEMDH, GONZAGA, CAGAYAN'}</span></div>
                <div className="flex items-end"><span className="w-20 text-[9px]">DATE:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.certifiedAt ? new Date(record.certifiedAt).toLocaleDateString('en-GB') : '02/09/2026'}</span></div>
              </div>
              <div className="col-span-5 border border-black p-1 flex flex-col justify-between text-[8px]">
                <div className="text-center">
                  <span className="font-bold block text-slate-700 text-left text-[7px]">REVIEWED BY:</span>
                  <span className="font-bold text-[10px] uppercase block mt-0.5">{record?.verifiedBy || 'DRA. MILDRED EVELYN FRANCES M. PALPALLATOC, MHA'}</span>
                  <div className="border-t border-black mx-auto w-4/5 pt-0.5 text-[6px] mt-0.5">SIGNATURE OVER PRINTED NAME OF HEALTH OFFICER</div>
                </div>
                <div className="text-center mt-0.5">
                  <div className="border-b border-black mx-auto w-3/4 font-bold text-[10px]">{record?.verifiedAt ? new Date(record.verifiedAt).toLocaleDateString('en-US') : '9/2/2026'}</div>
                  <span className="text-[6px] block">DATE</span>
                </div>
              </div>
            </div>
          </div>

          {/* 26 & 27: Informant & Prepared By */}
          <div className="grid grid-cols-12 border-b border-black font-sans text-xs flex-[1.5]">
            <div className="col-span-6 border-r border-black p-1.5 space-y-0.5 flex flex-col justify-between">
              <span className="text-[8px] font-bold text-slate-700 block">26. CERTIFICATION OF INFORMANT</span>
              <div className="flex items-end"><span className="w-20 text-[9px]">NAME:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{informant?.name || 'JANE CAMIT'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">RELATIONSHIP:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{informant?.relationship || 'DAUGHTER'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">ADDRESS:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px] truncate">{informant?.address ? `${informant.address.barangay || ''}, ${informant.address.city || ''}, ${informant.address.province || ''}` : 'SAN JOSE, GONZAGA, CAGAYAN'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">DATE:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : '02/09/2026'}</span></div>
            </div>
            <div className="col-span-6 p-1.5 space-y-0.5 flex flex-col justify-between">
              <span className="text-[8px] font-bold text-slate-700 block">27. PREPARED BY</span>
              <div className="flex items-end"><span className="w-20 text-[9px]">NAME IN PRINT:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.createdBy || 'ALLAN JAYSON TORRES'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">TITLE/POSITION:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{creatorDetails.titlePosition || 'MEDICAL RECORDS OFFICER'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">ADDRESS:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{creatorDetails.address || 'APEMDH, GONZAGA, CAGAYAN'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">DATE:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : '02/09/2026'}</span></div>
            </div>
          </div>

          {/* 28 & 29: Received & Registered */}
          <div className="grid grid-cols-12 font-sans text-xs flex-[1.5]">
            <div className="col-span-6 p-1.5 border-r border-black space-y-0.5 flex flex-col justify-between">
              <span className="text-[8px] font-bold text-slate-700 block">28. RECEIVED BY</span>
              <div className="flex items-end"><span className="w-20 text-[9px]">NAME IN PRINT:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.approvedBy || 'GUILLERMO R. IMPERIO'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">TITLE/POSITION:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{approverDetails.titlePosition || 'MUNICIPAL MAYOR'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">ADDRESS:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{approverDetails.address || 'GONZAGA, CAGAYAN'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">DATE:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.approvedAt ? new Date(record.approvedAt).toLocaleDateString('en-GB') : '02/09/2026'}</span></div>
            </div>
            <div className="col-span-6 p-1.5 space-y-0.5 flex flex-col justify-between">
              <span className="text-[8px] font-bold text-slate-700 block">29. REGISTERED AT CIVIL REGISTRAR</span>
              <div className="flex items-end"><span className="w-20 text-[9px]">NAME IN PRINT:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.submittedBy || 'WALDEN S. VENTURA'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">TITLE/POSITION:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{submitterDetails.titlePosition || 'LOCAL CIVIL REGISTRAR'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">ADDRESS:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{submitterDetails.address || 'GONZAGA, CAGAYAN'}</span></div>
              <div className="flex items-end"><span className="w-20 text-[9px]">DATE:</span><span className="flex-1 border-b border-black font-bold text-center uppercase text-[10px]">{record?.submittedAt ? new Date(record.submittedAt).toLocaleDateString('en-GB') : '02/09/2026'}</span></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}