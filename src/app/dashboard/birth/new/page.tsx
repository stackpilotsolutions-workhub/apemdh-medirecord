'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createBirthRecordAction, checkDuplicateBirthAction } from '@/app/actions/birth';
import { Baby, ArrowLeft, ShieldCheck, ShieldAlert, Info, User, Users, Heart, Stethoscope, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function NewBirthRecordPage() {
  const { user } = useAuth();
  const router = useRouter();

  // --- 1. CHILD DEMOGRAPHICS ---
  const [childFirstName, setChildFirstName] = useState('');
  const [childMiddleName, setChildMiddleName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childExtension, setChildExtension] = useState('');
  const [childGender, setChildGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [birthDate, setBirthDate] = useState('');
  
  // Place of birth breakdown
  const [hospitalName, setHospitalName] = useState('Alfonso Ponce Enrile Memorial District Hospital');
  const [birthCity, setBirthCity] = useState('');
  const [birthProvince, setBirthProvince] = useState('');

  // Birth Details
  const [typeOfBirth, setTypeOfBirth] = useState<'Single' | 'Twin' | 'Triplet' | 'Other'>('Single');
  const [multipleBirthOrder, setMultipleBirthOrder] = useState('N/A');
  const [birthOrder, setBirthOrder] = useState('First');
  const [birthWeightGrams, setBirthWeightGrams] = useState('');

  // --- 2. MOTHER'S INFORMATION ---
  const [motherFirstName, setMotherFirstName] = useState('');
  const [motherMiddleName, setMotherMiddleName] = useState('');
  const [motherLastName, setMotherLastName] = useState('');
  const [motherExtension, setMotherExtension] = useState('');
  const [motherCitizenship, setMotherCitizenship] = useState('Filipino');
  const [motherReligion, setMotherReligion] = useState('Roman Catholic');
  const [motherChildrenBornAlive, setMotherChildrenBornAlive] = useState('');
  const [motherChildrenLiving, setMotherChildrenLiving] = useState('');
  const [motherChildrenDead, setMotherChildrenDead] = useState('0');
  const [motherOccupation, setMotherOccupation] = useState('');
  const [motherAge, setMotherAge] = useState('');
  // Residence
  const [motherStreet, setMotherStreet] = useState('');
  const [motherCity, setMotherCity] = useState('');
  const [motherProvince, setMotherProvince] = useState('');
  const [motherCountry, setMotherCountry] = useState('Philippines');

  // --- 3. FATHER'S INFORMATION ---
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [fatherMiddleName, setFatherMiddleName] = useState('');
  const [fatherLastName, setFatherLastName] = useState('');
  const [fatherExtension, setFatherExtension] = useState('');
  const [fatherCitizenship, setFatherCitizenship] = useState('Filipino');
  const [fatherReligion, setFatherReligion] = useState('Roman Catholic');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [fatherAge, setFatherAge] = useState('');
  // Residence
  const [fatherStreet, setFatherStreet] = useState('');
  const [fatherCity, setFatherCity] = useState('');
  const [fatherProvince, setFatherProvince] = useState('');
  const [fatherCountry, setFatherCountry] = useState('Philippines');

  // --- 4. MARRIAGE OF PARENTS ---
  const [parentsNotMarried, setParentsNotMarried] = useState(false);
  const [marriageDate, setMarriageDate] = useState('');
  const [marriageCity, setMarriageCity] = useState('');
  const [marriageProvince, setMarriageProvince] = useState('');
  const [marriageCountry, setMarriageCountry] = useState('Philippines');

  // --- 5. ATTENDANT ---
  const [attendantType, setAttendantType] = useState('Physician');
  const [attendantOthersSpecify, setAttendantOthersSpecify] = useState('');

  // --- 6. INFORMANT CERTIFICATION ---
  const [informantIsParent, setInformantIsParent] = useState<'NONE' | 'MOTHER' | 'FATHER'>('NONE');
  const [informantName, setInformantName] = useState('');
  const [informantRelationship, setInformantRelationship] = useState('');
  const [informantAddress, setInformantAddress] = useState('');
  const [informantDate] = useState(new Date().toISOString().split('T')[0]);

  // --- 7. REMARKS / ANNOTATION ---
  const [notes, setNotes] = useState('');

  // Duplicate Check & Loading States
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateNum, setDuplicateNum] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync Informant when Parent Shortcut option is selected
  useEffect(() => {
    if (informantIsParent === 'MOTHER') {
      const fullMotherName = `${motherFirstName} ${motherMiddleName} ${motherLastName} ${motherExtension}`.replace(/\s+/g, ' ').trim();
      const motherAddress = `${motherStreet}, ${motherCity}, ${motherProvince}, ${motherCountry}`.replace(/(^[,\s]+)|(^[,\s]+$)/g, '');
      setInformantName(fullMotherName);
      setInformantRelationship('Mother');
      setInformantAddress(motherAddress);
    } else if (informantIsParent === 'FATHER') {
      const fullFatherName = `${fatherFirstName} ${fatherMiddleName} ${fatherLastName} ${fatherExtension}`.replace(/\s+/g, ' ').trim();
      const fatherAddress = `${fatherStreet}, ${fatherCity}, ${fatherProvince}, ${fatherCountry}`.replace(/(^[,\s]+)|(^[,\s]+$)/g, '');
      setInformantName(fullFatherName);
      setInformantRelationship('Father');
      setInformantAddress(fatherAddress);
    }
  }, [
    informantIsParent,
    motherFirstName, motherMiddleName, motherLastName, motherExtension, motherStreet, motherCity, motherProvince, motherCountry,
    fatherFirstName, fatherMiddleName, fatherLastName, fatherExtension, fatherStreet, fatherCity, fatherProvince, fatherCountry
  ]);

  // Trigger duplicate check on blur of key fields
  const performDuplicateCheck = async () => {
    const fullChildName = `${childFirstName} ${childLastName}`.trim();
    const fullMotherName = `${motherFirstName} ${motherLastName}`.trim();

    if (!fullChildName || !fullMotherName || !birthDate) return;

    try {
      setCheckingDuplicate(true);
      const res = await checkDuplicateBirthAction(fullChildName, fullMotherName, birthDate);
      setIsDuplicate(res.isDuplicate);
      if (res.isDuplicate && res.duplicateRecord) {
        setDuplicateNum(res.duplicateRecord.certificateNumber);
        toast.warning(`Warning: A duplicate record was detected (${res.duplicateRecord.certificateNumber}).`);
      } else {
        setDuplicateNum('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleBlur = () => {
    performDuplicateCheck();
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!childFirstName || !childLastName || !birthDate || !hospitalName || !motherFirstName || !motherLastName) {
    toast.error('Please fill in all mandatory fields (Child name, Birth date, Hospital, Mother name).');
    return;
  }

  try {
    setSubmitting(true);

    const fullChildName = `${childFirstName} ${childMiddleName} ${childLastName} ${childExtension}`.replace(/\s+/g, ' ').trim();
    const fullMotherName = `${motherFirstName} ${motherMiddleName} ${motherLastName} ${motherExtension}`.replace(/\s+/g, ' ').trim();
    const fullFatherName = `${fatherFirstName} ${fatherMiddleName} ${fatherLastName} ${fatherExtension}`.replace(/\s+/g, ' ').trim();
    const formattedPlaceOfBirth = `${hospitalName}, ${birthCity}, ${birthProvince}`.replace(/(^[,\s]+)|(^[,\s]+$)/g, '');

    // Serialize all granular fields into structured JSON string for `notes` or custom JSON field
    const structuredDetails = JSON.stringify({
      child: {
        firstName: childFirstName,
        middleName: childMiddleName || null,
        lastName: childLastName,
        extension: childExtension || null,
        typeOfBirth,
        multipleBirthOrder: typeOfBirth !== 'Single' ? multipleBirthOrder : 'N/A',
        birthOrder,
        birthWeightGrams: birthWeightGrams ? parseInt(birthWeightGrams, 10) : null,
      },
      mother: {
        firstName: motherFirstName,
        middleName: motherMiddleName || null,
        lastName: motherLastName,
        extension: motherExtension || null,
        citizenship: motherCitizenship,
        religion: motherReligion,
        occupation: motherOccupation || null,
        age: motherAge ? parseInt(motherAge, 10) : null,
        childrenBornAlive: motherChildrenBornAlive ? parseInt(motherChildrenBornAlive, 10) : 0,
        childrenLiving: motherChildrenLiving ? parseInt(motherChildrenLiving, 10) : 0,
        childrenDead: motherChildrenDead ? parseInt(motherChildrenDead, 10) : 0,
        residence: {
          street: motherStreet || null,
          city: motherCity || null,
          province: motherProvince || null,
          country: motherCountry,
        },
      },
      father: fatherFirstName ? {
        firstName: fatherFirstName,
        middleName: fatherMiddleName || null,
        lastName: fatherLastName,
        extension: fatherExtension || null,
        citizenship: fatherCitizenship,
        religion: fatherReligion,
        occupation: fatherOccupation || null,
        age: fatherAge ? parseInt(fatherAge, 10) : null,
        residence: {
          street: fatherStreet || null,
          city: fatherCity || null,
          province: fatherProvince || null,
          country: fatherCountry,
        },
      } : null,
      marriage: parentsNotMarried ? {
        isMarried: false,
      } : {
        isMarried: true,
        date: marriageDate || null,
        city: marriageCity || null,
        province: marriageProvince || null,
        country: marriageCountry,
      },
      attendant: {
        type: attendantType,
        specificTitle: attendantType === 'Others' ? attendantOthersSpecify : null,
      },
      informant: {
        isParentShortcut: informantIsParent,
        name: informantName,
        relationship: informantRelationship,
        address: informantAddress,
        date: informantDate,
      },
      remarks: notes || null,
      isDuplicateFlag: isDuplicate,
    });

    await createBirthRecordAction({
      childName: fullChildName,
      childGender,
      birthDate,
      birthTime: 'N/A',
      placeOfBirth: formattedPlaceOfBirth,
      motherName: fullMotherName,
      fatherName: fatherFirstName ? fullFatherName : '',
      notes: structuredDetails,
      createdBy: user?.name || user?.email || 'Unknown User',
    });

    toast.success('Birth certificate draft saved successfully.');
    router.push('/dashboard/birth');
  } catch (err: any) {
    console.error('Database Insertion Error:', err);
    toast.error(err.message || 'Failed to create birth record.');
  } finally {
    setSubmitting(false);
  }
};

  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const previewCertNum = `BR-${todayStr}-XXXX`;

  if (user?.role !== 'MRO' && user?.role !== 'ADMIN') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-sm flex flex-col gap-3">
        <span className="font-bold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Access Restrained
        </span>
        <p>Only Medical Records Officers (MRO) and Hospital Administrators are authorized to draft birth records.</p>
        <Link href="/dashboard" className="text-teal-700 font-bold underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/birth" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs text-slate-500 font-semibold">Back to Registry</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Register Certificate of Live Birth</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Standard Civil Registry (PSA Form No. 102) Record Entry Form</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs text-slate-600 font-bold self-start sm:self-auto">
          <span>Allocation:</span>
          <span className="text-teal-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">{previewCertNum}</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* CARD 1: CHILD DEMOGRAPHICS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Baby className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">1. Child's Information</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Full Name Block */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Child's Name</span>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">First Name *</label>
                    <input
                      type="text"
                      value={childFirstName}
                      onChange={(e) => setChildFirstName(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g. Juan"
                      className="input-field"
                      required
                    />
                    <p className="text-[11px] text-slate-400">Given name(s)</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Middle Name</label>
                    <input
                      type="text"
                      value={childMiddleName}
                      onChange={(e) => setChildMiddleName(e.target.value)}
                      placeholder="e.g. Santos"
                      className="input-field"
                    />
                    <p className="text-[11px] text-slate-400">Mother's maiden last name</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Last Name *</label>
                    <input
                      type="text"
                      value={childLastName}
                      onChange={(e) => setChildLastName(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g. Dela Cruz"
                      className="input-field"
                      required
                    />
                    <p className="text-[11px] text-slate-400">Father's last name</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Suffix / Ext.</label>
                    <input
                      type="text"
                      value={childExtension}
                      onChange={(e) => setChildExtension(e.target.value)}
                      placeholder="e.g. Jr., III"
                      className="input-field"
                    />
                    <p className="text-[11px] text-slate-400">Optional (e.g. Jr., III)</p>
                  </div>
                </div>
              </div>

              {/* Sex & Date of Birth */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Sex *</label>
                  <select
                    value={childGender}
                    onChange={(e) => setChildGender(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Date of Birth *</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    onBlur={handleBlur}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Place of Birth */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Place of Birth</span>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Hospital / Institution *</label>
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="Hospital / Clinic Name"
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">City / Municipality *</label>
                    <input
                      type="text"
                      value={birthCity}
                      onChange={(e) => setBirthCity(e.target.value)}
                      placeholder="e.g. San Fernando"
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Province *</label>
                    <input
                      type="text"
                      value={birthProvince}
                      onChange={(e) => setBirthProvince(e.target.value)}
                      placeholder="e.g. Pampanga"
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Delivery & Physical Details */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Delivery & Physical Details</span>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Type of Birth</label>
                    <select
                      value={typeOfBirth}
                      onChange={(e) => setTypeOfBirth(e.target.value as any)}
                      className="input-field"
                    >
                      <option value="Single">Single</option>
                      <option value="Twin">Twin</option>
                      <option value="Triplet">Triplet</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Multiple Birth Order</label>
                    <select
                      value={multipleBirthOrder}
                      onChange={(e) => setMultipleBirthOrder(e.target.value)}
                      disabled={typeOfBirth === 'Single'}
                      className="input-field disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="N/A">N/A (Single Birth)</option>
                      <option value="First">First</option>
                      <option value="Second">Second</option>
                      <option value="Third">Third</option>
                    </select>
                    <p className="text-[11px] text-slate-400">Order of delivery if multiple</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Birth Order</label>
                    <input
                      type="text"
                      value={birthOrder}
                      onChange={(e) => setBirthOrder(e.target.value)}
                      placeholder="e.g. First, Second"
                      className="input-field"
                    />
                    <p className="text-[11px] text-slate-400">Including live births & fetal deaths</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Birth Weight (grams)</label>
                    <input
                      type="number"
                      value={birthWeightGrams}
                      onChange={(e) => setBirthWeightGrams(e.target.value)}
                      placeholder="e.g. 3200"
                      className="input-field"
                    />
                    <p className="text-[11px] text-slate-400">Weight in grams (e.g. 3000g = 3kg)</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* CARD 2: MOTHER DETAILS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <User className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">2. Mother's Maiden Information</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Maiden Name */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Full Maiden Name</span>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">First Name *</label>
                    <input
                      type="text"
                      value={motherFirstName}
                      onChange={(e) => setMotherFirstName(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g. Maria"
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Middle Name</label>
                    <input
                      type="text"
                      value={motherMiddleName}
                      onChange={(e) => setMotherMiddleName(e.target.value)}
                      placeholder="e.g. Mercado"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Last Name *</label>
                    <input
                      type="text"
                      value={motherLastName}
                      onChange={(e) => setMotherLastName(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g. Santos"
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Extension</label>
                    <input
                      type="text"
                      value={motherExtension}
                      onChange={(e) => setMotherExtension(e.target.value)}
                      placeholder="e.g. Jr."
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Citizenship</label>
                  <input
                    type="text"
                    value={motherCitizenship}
                    onChange={(e) => setMotherCitizenship(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Religion</label>
                  <input
                    type="text"
                    value={motherReligion}
                    onChange={(e) => setMotherReligion(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Occupation</label>
                  <input
                    type="text"
                    value={motherOccupation}
                    onChange={(e) => setMotherOccupation(e.target.value)}
                    placeholder="e.g. Teacher"
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Age (at birth)</label>
                  <input
                    type="number"
                    value={motherAge}
                    onChange={(e) => setMotherAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Children Count Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Children Record Counter</span>
                  <p className="text-[11px] text-slate-400">Count includes this current birth</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 bg-teal-50/40 p-3 rounded-xl border border-teal-100/60">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Total Children Born Alive</label>
                    <input
                      type="number"
                      value={motherChildrenBornAlive}
                      onChange={(e) => setMotherChildrenBornAlive(e.target.value)}
                      placeholder="0"
                      className="input-field bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Children Still Living</label>
                    <input
                      type="number"
                      value={motherChildrenLiving}
                      onChange={(e) => setMotherChildrenLiving(e.target.value)}
                      placeholder="0"
                      className="input-field bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Born Alive but Deceased</label>
                    <input
                      type="number"
                      value={motherChildrenDead}
                      onChange={(e) => setMotherChildrenDead(e.target.value)}
                      placeholder="0"
                      className="input-field bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Residence */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Mother's Residence</span>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block">House No. / Street / Barangay</label>
                    <input
                      type="text"
                      value={motherStreet}
                      onChange={(e) => setMotherStreet(e.target.value)}
                      placeholder="e.g. 123 Main St, Brgy. San Jose"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">City / Municipality</label>
                    <input
                      type="text"
                      value={motherCity}
                      onChange={(e) => setMotherCity(e.target.value)}
                      placeholder="e.g. Angeles City"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Province & Country</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={motherProvince}
                        onChange={(e) => setMotherProvince(e.target.value)}
                        placeholder="Province"
                        className="input-field"
                      />
                      <input
                        type="text"
                        value={motherCountry}
                        onChange={(e) => setMotherCountry(e.target.value)}
                        placeholder="Country"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: FATHER DETAILS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">3. Father's Information</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Optional if parents are not married</span>
            </div>

            <div className="p-6 space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Full Name</span>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">First Name</label>
                    <input
                      type="text"
                      value={fatherFirstName}
                      onChange={(e) => setFatherFirstName(e.target.value)}
                      placeholder="e.g. Juan"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Middle Name</label>
                    <input
                      type="text"
                      value={fatherMiddleName}
                      onChange={(e) => setFatherMiddleName(e.target.value)}
                      placeholder="e.g. Ramos"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Last Name</label>
                    <input
                      type="text"
                      value={fatherLastName}
                      onChange={(e) => setFatherLastName(e.target.value)}
                      placeholder="e.g. Dela Cruz"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Extension</label>
                    <input
                      type="text"
                      value={fatherExtension}
                      onChange={(e) => setFatherExtension(e.target.value)}
                      placeholder="e.g. Sr."
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Citizenship</label>
                  <input
                    type="text"
                    value={fatherCitizenship}
                    onChange={(e) => setFatherCitizenship(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Religion</label>
                  <input
                    type="text"
                    value={fatherReligion}
                    onChange={(e) => setFatherReligion(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Occupation</label>
                  <input
                    type="text"
                    value={fatherOccupation}
                    onChange={(e) => setFatherOccupation(e.target.value)}
                    placeholder="e.g. Engineer"
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Age (at birth)</label>
                  <input
                    type="number"
                    value={fatherAge}
                    onChange={(e) => setFatherAge(e.target.value)}
                    placeholder="e.g. 30"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Residence */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Father's Residence</span>
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block">House No. / Street / Barangay</label>
                    <input
                      type="text"
                      value={fatherStreet}
                      onChange={(e) => setFatherStreet(e.target.value)}
                      placeholder="e.g. 123 Main St, Brgy. San Jose"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">City / Municipality</label>
                    <input
                      type="text"
                      value={fatherCity}
                      onChange={(e) => setFatherCity(e.target.value)}
                      placeholder="e.g. Angeles City"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Province & Country</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={fatherProvince}
                        onChange={(e) => setFatherProvince(e.target.value)}
                        placeholder="Province"
                        className="input-field"
                      />
                      <input
                        type="text"
                        value={fatherCountry}
                        onChange={(e) => setFatherCountry(e.target.value)}
                        placeholder="Country"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: MARRIAGE OF PARENTS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">4. Marriage of Parents</h2>
              </div>
              
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-white px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={parentsNotMarried}
                  onChange={(e) => {
                    setParentsNotMarried(e.target.checked);
                    if (e.target.checked) {
                      setMarriageDate('');
                      setMarriageCity('');
                      setMarriageProvince('');
                    }
                  }}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Not Married
              </label>
            </div>

            <div className="p-6">
              <div className="grid sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Date of Marriage</label>
                  <input
                    type="date"
                    value={marriageDate}
                    onChange={(e) => setMarriageDate(e.target.value)}
                    disabled={parentsNotMarried}
                    className="input-field disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">City / Municipality</label>
                  <input
                    type="text"
                    value={marriageCity}
                    onChange={(e) => setMarriageCity(e.target.value)}
                    disabled={parentsNotMarried}
                    placeholder="e.g. Angeles City"
                    className="input-field disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Province</label>
                  <input
                    type="text"
                    value={marriageProvince}
                    onChange={(e) => setMarriageProvince(e.target.value)}
                    disabled={parentsNotMarried}
                    placeholder="e.g. Pampanga"
                    className="input-field disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Country</label>
                  <input
                    type="text"
                    value={marriageCountry}
                    onChange={(e) => setMarriageCountry(e.target.value)}
                    disabled={parentsNotMarried}
                    className="input-field disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
              {parentsNotMarried && (
                <p className="text-xs text-amber-600 mt-3 font-medium flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  Parents selected as not married. Marriage fields disabled.
                </p>
              )}
            </div>
          </div>

          {/* CARD 5: ATTENDANT */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">5. Attendant at Birth</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {['Physician', 'Nurse', 'Midwife', 'Hilot', 'Others'].map((item) => (
                  <label key={item} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-bold transition ${
                    attendantType === item 
                      ? 'border-teal-500 bg-teal-50/50 text-teal-900 shadow-sm' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="attendant"
                      value={item}
                      checked={attendantType === item}
                      onChange={(e) => setAttendantType(e.target.value)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    {item}
                  </label>
                ))}
              </div>

              {attendantType === 'Others' && (
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-semibold text-slate-600 block">Specify Attendant Title / Name</label>
                  <input
                    type="text"
                    value={attendantOthersSpecify}
                    onChange={(e) => setAttendantOthersSpecify(e.target.value)}
                    placeholder="Specify attendant category or name"
                    className="input-field"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CARD 6: INFORMANT CERTIFICATION */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">6. Certification of Informant</h2>
              </div>

              {/* Informant Parent Shortcut Options */}
              <div className="flex items-center gap-3 text-xs bg-white px-3 py-1 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-400 font-bold">Auto-fill from:</span>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700">
                  <input
                    type="radio"
                    name="informantParent"
                    checked={informantIsParent === 'MOTHER'}
                    onChange={() => setInformantIsParent('MOTHER')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  Mother
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700">
                  <input
                    type="radio"
                    name="informantParent"
                    checked={informantIsParent === 'FATHER'}
                    onChange={() => setInformantIsParent('FATHER')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  Father
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700">
                  <input
                    type="radio"
                    name="informantParent"
                    checked={informantIsParent === 'NONE'}
                    onChange={() => setInformantIsParent('NONE')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  Others
                </label>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Informant Full Name</label>
                  <input
                    type="text"
                    value={informantName}
                    onChange={(e) => setInformantName(e.target.value)}
                    disabled={informantIsParent !== 'NONE'}
                    placeholder="Full name of informant"
                    className="input-field disabled:bg-slate-100 disabled:text-slate-600 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Relationship to Child</label>
                  <input
                    type="text"
                    value={informantRelationship}
                    onChange={(e) => setInformantRelationship(e.target.value)}
                    disabled={informantIsParent !== 'NONE'}
                    placeholder="e.g. Mother, Father, Grandmother"
                    className="input-field disabled:bg-slate-100 disabled:text-slate-600 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Certification Date</label>
                  <input
                    type="text"
                    value={informantDate}
                    disabled
                    className="input-field bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400">Auto-filled date today</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Complete Address</label>
                <input
                  type="text"
                  value={informantAddress}
                  onChange={(e) => setInformantAddress(e.target.value)}
                  disabled={informantIsParent !== 'NONE'}
                  placeholder="Informant's current home address"
                  className="input-field disabled:bg-slate-100 disabled:text-slate-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* CARD 7: REMARKS & ANNOTATIONS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">7. Clinical Remarks & Registration Annotations</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="State any legal annotations, clinical remarks, or special delivery notes..."
              rows={3}
              className="input-field resize-none py-3"
            />
          </div>

          {/* DUPLICATE CHECK ALERT */}
          {checkingDuplicate ? (
            <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-500 animate-pulse flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              Running live background duplicate registry verification...
            </div>
          ) : isDuplicate ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex gap-3 items-start animate-shake">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block">Potential Duplicate Record Warning!</span>
                <p className="opacity-90 mt-1 leading-relaxed">
                  A certificate with matching details (Child: <span className="font-bold">{childFirstName} {childLastName}</span>, Mother: <span className="font-bold">{motherFirstName} {motherLastName}</span>, Date: <span className="font-bold">{birthDate}</span>) is already registered under entry <span className="font-bold underline">{duplicateNum}</span>. Saving will flag this entry for mandatory administrative audit.
                </p>
              </div>
            </div>
          ) : childFirstName && motherFirstName && birthDate ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex gap-3 items-center">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block text-sm">Unique Entry Verified</span>
                <p className="opacity-90 mt-0.5">No matching active records found in database. Clear for drafting.</p>
              </div>
            </div>
          ) : null}

          {/* SUBMIT BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/dashboard/birth" className="btn-secondary px-6">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-8"
            >
              {submitting ? 'Saving Draft Record...' : 'Save Draft Record'}
            </button>
          </div>

        </form>
      </motion.div>

    </div>
  );
}