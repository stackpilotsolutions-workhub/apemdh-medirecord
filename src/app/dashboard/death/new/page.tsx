'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createDeathRecordAction, checkDuplicateDeathAction } from '@/app/actions/death';
import { DeathRecord, DeathRecordStructuredDetails } from '@/lib/types';
import {
  HeartOff,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  FileText,
  User,
  Heart,
  Stethoscope,
  UserCheck,
  AlertCircle,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function NewDeathRecordPage() {
  const { user } = useAuth();
  const router = useRouter();

  // --- Place of Death Location ---
  const [podProvince, setPodProvince] = useState('');
  const [podCity, setPodCity] = useState('');
  const [podHospital, setPodHospital] = useState('Alfonso Ponce Enrile Memorial District Hospital');
  const [podBarangay, setPodBarangay] = useState('');

  // --- Deceased Demographics ---
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [nameExtension, setNameExtension] = useState(''); // e.g. Jr., III

  const [sex, setSex] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfDeath, setDateOfDeath] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Age Breakdown (At time of death)
  const [ageYears, setAgeYears] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [ageDays, setAgeDays] = useState('');
  const [ageHours, setAgeHours] = useState('');
  const [ageMinutes, setAgeMinutes] = useState('');

  const [civilStatus, setCivilStatus] = useState('SINGLE');
  const [religion, setReligion] = useState('');
  const [citizenship, setCitizenship] = useState('Filipino');
  const [occupation, setOccupation] = useState('');

  // Deceased Residence
  const [resBarangay, setResBarangay] = useState('');
  const [resCity, setResCity] = useState('');
  const [resProvince, setResProvince] = useState('');
  const [resCountry, setResCountry] = useState('Philippines');

  // Parents
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [fatherMiddleName, setFatherMiddleName] = useState('');
  const [fatherLastName, setFatherLastName] = useState('');

  const [motherFirstName, setMotherFirstName] = useState('');
  const [motherMiddleName, setMotherMiddleName] = useState('');
  const [motherLastName, setMotherLastName] = useState('');

  // --- Medical / Causes of Death ---
  const [immediateCause, setImmediateCause] = useState('');
  const [antecedentCause, setAntecedentCause] = useState('');
  const [underlyingCause, setUnderlyingCause] = useState('');
  const [otherConditions, setOtherConditions] = useState('');

  // Autopsy Field
  const [autopsy, setAutopsy] = useState<'YES' | 'NO'>('NO');

  // Maternal Condition (Females 15-49)
  const [maternalCondition, setMaternalCondition] = useState('none');

  // External Causes (Standalone Section)
  const [mannerOfDeath, setMannerOfDeath] = useState('');
  const [placeOfExternalCause, setPlaceOfExternalCause] = useState('');

  // Attendant Details (Radio Options)
  const [attendantType, setAttendantType] = useState('HOSPITAL_AUTHORITY');
  const [attendantOthers, setAttendantOthers] = useState('');
  const [attendedFrom, setAttendedFrom] = useState('');
  const [attendedTo, setAttendedTo] = useState('');

  // Informant Details
  const [informantLastName, setInformantLastName] = useState('');
  const [informantFirstName, setInformantFirstName] = useState('');
  const [informantMiddleName, setInformantMiddleName] = useState('');
  const [informantExtension, setInformantExtension] = useState('');
  const [informantRelationship, setInformantRelationship] = useState('');
  const [informantBarangay, setInformantBarangay] = useState('');
  const [informantCity, setInformantCity] = useState('');
  const [informantProvince, setInformantProvince] = useState('');

  const [notes, setNotes] = useState('');

  // Duplicate Check & UI States
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateNum, setDuplicateNum] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derived Full Name for Duplicate Checks
  const fullDeceasedName = [firstName, middleName, lastName, nameExtension].filter(Boolean).join(' ');

  // Live Auto-Calculate Age based on DOB & DOD
  useEffect(() => {
    if (!dateOfBirth || !dateOfDeath) return;
    const dob = new Date(dateOfBirth);
    const dod = new Date(dateOfDeath);

    if (isNaN(dob.getTime()) || isNaN(dod.getTime()) || dod < dob) return;

    const diffTime = Math.abs(dod.getTime() - dob.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365.25);

    if (years >= 1) {
      setAgeYears(years.toString());
      setAgeMonths('');
      setAgeDays('');
      setAgeHours('');
      setAgeMinutes('');
    } else {
      setAgeYears('0');
      const months = Math.floor(diffDays / 30.44);
      const remainingDays = Math.floor(diffDays % 30.44);
      setAgeMonths(months.toString());
      setAgeDays(remainingDays.toString());
    }
  }, [dateOfBirth, dateOfDeath]);

  // Dynamic Age Rule Logic for Conditional Sections
  const calculatedYears = parseInt(ageYears || '0', 10);
  const calculatedDays = (calculatedYears * 365) + (parseInt(ageMonths || '0', 10) * 30) + parseInt(ageDays || '0', 10);
  
  const isEligibleForCauseOfDeath = calculatedDays >= 8 || (!dateOfBirth && !dateOfDeath);
  const isEligibleForMaternalCondition = sex === 'FEMALE' && calculatedYears >= 15 && calculatedYears <= 49;

  // Duplicate Record Check
  const performDuplicateCheck = async () => {
    if (!fullDeceasedName || !dateOfDeath) return;

    try {
      setCheckingDuplicate(true);
      const res = await checkDuplicateDeathAction(fullDeceasedName, dateOfDeath);
      setIsDuplicate(res.isDuplicate);
      if (res.isDuplicate && res.duplicateRecord) {
        setDuplicateNum(res.duplicateRecord.certificateNumber);
        toast.warning(`Warning: A duplicate death entry was detected (${res.duplicateRecord.certificateNumber}).`);
      } else {
        setDuplicateNum('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingDuplicate(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!firstName || !lastName || !dateOfDeath || !podHospital || !informantFirstName || !informantLastName) {
    toast.error('Please fill in all mandatory fields (Deceased name, Date of Death, Place of Death, Informant name).');
    return;
  }

  try {
    setSubmitting(true);

    const formattedDeceasedName = `${firstName} ${middleName} ${lastName} ${nameExtension}`.replace(/\s+/g, ' ').trim();
    const formattedPlaceOfDeath = `${podHospital}, ${podBarangay}, ${podCity}, ${podProvince}`.replace(/(^[,\s]+)|(^[,\s]+$)/g, '');
    const formattedInformantName = `${informantFirstName} ${informantMiddleName} ${informantLastName} ${informantExtension}`.replace(/\s+/g, ' ').trim();
    const numericAge = parseInt(ageYears || '0', 10);

    // Build object for the dedicated `details` JSONB field
    const structuredDetails = {
      deceased: {
        firstName,
        middleName: middleName || null,
        lastName,
        extension: nameExtension || null,
        sex,
        dateOfBirth: dateOfBirth || null,
        dateOfDeath,
        ageBreakdown: {
          years: ageYears ? parseInt(ageYears, 10) : 0,
          months: ageMonths ? parseInt(ageMonths, 10) : 0,
          days: ageDays ? parseInt(ageDays, 10) : 0,
          hours: ageHours ? parseInt(ageHours, 10) : 0,
          minutes: ageMinutes ? parseInt(ageMinutes, 10) : 0,
        },
        civilStatus,
        religion: religion || null,
        citizenship,
        occupation: occupation || null,
        residence: {
          barangay: resBarangay || null,
          city: resCity || null,
          province: resProvince || null,
          country: resCountry,
        },
      },
      placeOfDeath: {
        hospital: podHospital,
        barangay: podBarangay || null,
        city: podCity || null,
        province: podProvince || null,
      },
      parents: {
        father: fatherFirstName ? {
          firstName: fatherFirstName,
          middleName: fatherMiddleName || null,
          lastName: fatherLastName,
        } : null,
        mother: motherFirstName ? {
          firstName: motherFirstName,
          middleName: motherMiddleName || null,
          lastName: motherLastName,
        } : null,
      },
      causesOfDeath: isEligibleForCauseOfDeath ? {
        immediateCause: immediateCause || null,
        antecedentCause: antecedentCause || null,
        underlyingCause: underlyingCause || null,
        otherConditions: otherConditions || null,
      } : null,
      autopsy,
      maternalCondition: isEligibleForMaternalCondition ? maternalCondition : 'N/A',
      externalCauses: {
        mannerOfDeath: mannerOfDeath || null,
        placeOfOccurrence: placeOfExternalCause || null,
      },
      attendant: {
        type: attendantType,
        otherSpecify: attendantType === 'OTHERS' ? attendantOthers : null,
        duration: {
          from: attendedFrom || null,
          to: attendedTo || null,
        },
      },
      informant: {
        name: formattedInformantName,
        relationship: informantRelationship || null,
        address: {
          barangay: informantBarangay || null,
          city: informantCity || null,
          province: informantProvince || null,
        },
      },
      isDuplicateFlag: isDuplicate,
    };

    await createDeathRecordAction({
      deceasedName: formattedDeceasedName,
      deceasedAge: numericAge,
      deceasedGender: sex,
      dateOfDeath,
      placeOfDeath: formattedPlaceOfDeath,
      notes: notes || undefined, // Plain text remark
      details: structuredDetails, // Passed as an object directly to the JSONB field
    });

    toast.success('Death certificate draft saved successfully.');
    router.push('/dashboard/death');
  } catch (err: any) {
    console.error('Database Insertion Error:', err);
    toast.error(err.message || 'Failed to create death record.');
  } finally {
    setSubmitting(false);
  }
};

  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const previewCertNum = `DR-${todayStr}-XXXX`;

  // Authorization Check
  if (user?.role !== 'MRO' && user?.role !== 'ADMIN') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-sm flex flex-col gap-3">
        <span className="font-bold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Access Restrained
        </span>
        <p>Only Medical Records Officers (MRO) and Hospital Administrators are authorized to draft death records.</p>
        <Link href="/dashboard" className="text-teal-700 font-bold underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/death" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs text-slate-500 font-semibold">Back to Registry</span>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border">
          Form No. 103 (Certificate of Death)
        </span>
      </div>

      {/* Header Info */}
      <div className="pb-2">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Register Death Certificate</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Fill in official civil registry metrics. Ensure all items match the clinical record before draft creation.
        </p>
      </div>

      {/* Allocation Banner Card */}
      <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-4 flex items-center justify-between text-xs shadow-sm">
        <span className="font-bold text-teal-900 flex items-center gap-2">
          <HeartOff className="h-4 w-4 text-teal-700" />
          Official Registry Allocation Number
        </span>
        <span className="font-mono bg-white border border-teal-200 px-3 py-1 rounded-md text-teal-800 font-semibold shadow-2xs">
          {previewCertNum}
        </span>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CARD 1: LOCATION OF REGISTRATION */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Place of Registration & Event</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Province *</label>
              <input
                type="text"
                value={podProvince}
                onChange={(e) => setPodProvince(e.target.value)}
                placeholder="e.g. Cagayan"
                className="input-field"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">City / Municipality *</label>
              <input
                type="text"
                value={podCity}
                onChange={(e) => setPodCity(e.target.value)}
                placeholder="e.g. Tuguegarao City"
                className="input-field"
                required
              />
            </div>
          </div>
        </motion.div>

        {/* CARD 2: DECEASED DEMOGRAPHICS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Deceased Demographics</h3>
          </div>

          {/* Name Fields */}
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={performDuplicateCheck}
                placeholder="Juan"
                className="input-field"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Mercado"
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={performDuplicateCheck}
                placeholder="Dela Cruz"
                className="input-field"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Suffix / Ext.</label>
              <input
                type="text"
                value={nameExtension}
                onChange={(e) => setNameExtension(e.target.value)}
                placeholder="Jr., III (Optional)"
                className="input-field"
              />
            </div>
          </div>

          {/* Sex, DOB, DOD */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Sex *</label>
              <select value={sex} onChange={(e) => setSex(e.target.value as any)} className="input-field">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Date of Death *</label>
              <input
                type="date"
                value={dateOfDeath}
                onChange={(e) => setDateOfDeath(e.target.value)}
                onBlur={performDuplicateCheck}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Age Breakdown Matrix */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Age at the Time of Death</span>
              <span className="text-[10px] text-slate-500 font-medium">Fill in the applicable threshold</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="font-semibold text-slate-600 block">1 Year or Above</label>
                <input
                  type="number"
                  value={ageYears}
                  onChange={(e) => setAgeYears(e.target.value)}
                  placeholder="e.g. 71 (Completed Years)"
                  className="input-field text-xs"
                  min={0}
                />
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="font-semibold text-slate-600 block">Under 1 Year</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(e.target.value)}
                    placeholder="Months (11)"
                    className="input-field text-xs px-2"
                    min={0}
                    max={11}
                  />
                  <input
                    type="number"
                    value={ageDays}
                    onChange={(e) => setAgeDays(e.target.value)}
                    placeholder="Days (23)"
                    className="input-field text-xs px-2"
                    min={0}
                    max={31}
                  />
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="font-semibold text-slate-600 block">Under 24 Hours</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    value={ageHours}
                    onChange={(e) => setAgeHours(e.target.value)}
                    placeholder="Hours"
                    className="input-field text-xs px-2"
                    min={0}
                    max={23}
                  />
                  <input
                    type="number"
                    value={ageMinutes}
                    onChange={(e) => setAgeMinutes(e.target.value)}
                    placeholder="Mins"
                    className="input-field text-xs px-2"
                    min={0}
                    max={59}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Personal Details */}
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Civil Status</label>
              <select value={civilStatus} onChange={(e) => setCivilStatus(e.target.value)} className="input-field">
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="WIDOWED">Widowed</option>
                <option value="DIVORCED">Divorced / Separated</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Religion</label>
              <input
                type="text"
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                placeholder="e.g. Roman Catholic"
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Citizenship</label>
              <input
                type="text"
                value={citizenship}
                onChange={(e) => setCitizenship(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Occupation</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Farmer / Retired"
                className="input-field"
              />
            </div>
          </div>

          {/* Place of Death Details */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Place of Death Breakdown</label>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={podHospital}
                onChange={(e) => setPodHospital(e.target.value)}
                placeholder="Hospital/Clinic/Institution Name *"
                className="input-field sm:col-span-3"
                required
              />
              <input
                type="text"
                value={podBarangay}
                onChange={(e) => setPodBarangay(e.target.value)}
                placeholder="Barangay"
                className="input-field"
              />
              <input
                type="text"
                value={podCity}
                onChange={(e) => setPodCity(e.target.value)}
                placeholder="City / Municipality"
                className="input-field"
              />
              <input
                type="text"
                value={podProvince}
                onChange={(e) => setPodProvince(e.target.value)}
                placeholder="Province"
                className="input-field"
              />
            </div>
          </div>

          {/* Residence Details */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Usual Residence Breakdown</label>
            <div className="grid sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={resBarangay}
                onChange={(e) => setResBarangay(e.target.value)}
                placeholder="Barangay"
                className="input-field"
              />
              <input
                type="text"
                value={resCity}
                onChange={(e) => setResCity(e.target.value)}
                placeholder="City / Municipality"
                className="input-field"
              />
              <input
                type="text"
                value={resProvince}
                onChange={(e) => setResProvince(e.target.value)}
                placeholder="Province"
                className="input-field"
              />
              <input
                type="text"
                value={resCountry}
                onChange={(e) => setResCountry(e.target.value)}
                placeholder="Country"
                className="input-field"
              />
            </div>
          </div>
        </motion.div>

        {/* CARD 3: PARENTS' INFORMATION */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Heart className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">3. Parents' Information</h3>
          </div>

          {/* Father */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 block">Father's Full Name</span>
            <div className="grid sm:grid-cols-3 gap-3">
              <input type="text" value={fatherFirstName} onChange={(e) => setFatherFirstName(e.target.value)} placeholder="First Name" className="input-field" />
              <input type="text" value={fatherMiddleName} onChange={(e) => setFatherMiddleName(e.target.value)} placeholder="Middle Name" className="input-field" />
              <input type="text" value={fatherLastName} onChange={(e) => setFatherLastName(e.target.value)} placeholder="Last Name" className="input-field" />
            </div>
          </div>

          {/* Mother */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 block">Mother's Maiden Name</span>
            <div className="grid sm:grid-cols-3 gap-3">
              <input type="text" value={motherFirstName} onChange={(e) => setMotherFirstName(e.target.value)} placeholder="First Name" className="input-field" />
              <input type="text" value={motherMiddleName} onChange={(e) => setMotherMiddleName(e.target.value)} placeholder="Middle Name" className="input-field" />
              <input type="text" value={motherLastName} onChange={(e) => setMotherLastName(e.target.value)} placeholder="Last Name" className="input-field" />
            </div>
          </div>
        </motion.div>

        {/* CARD 4: MEDICAL CERTIFICATION & CAUSES OF DEATH */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">4. Causes of Death (Tentative/Partial)</h3>
            </div>
            {!isEligibleForCauseOfDeath && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                Infant &lt; 8 Days (Bypassed)
              </span>
            )}
          </div>

          <fieldset disabled={!isEligibleForCauseOfDeath} className="space-y-3 disabled:opacity-50">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">I. a. Immediate Cause</label>
              <input
                type="text"
                value={immediateCause}
                onChange={(e) => setImmediateCause(e.target.value)}
                placeholder="e.g. Acute Myocardial Infarction"
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">I. b. Antecedent Cause</label>
              <input
                type="text"
                value={antecedentCause}
                onChange={(e) => setAntecedentCause(e.target.value)}
                placeholder="e.g. Coronary Artery Disease"
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">I. c. Underlying Cause</label>
              <input
                type="text"
                value={underlyingCause}
                onChange={(e) => setUnderlyingCause(e.target.value)}
                placeholder="e.g. Essential Hypertension"
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">II. Other Significant Conditions Contributing to Death</label>
              <input
                type="text"
                value={otherConditions}
                onChange={(e) => setOtherConditions(e.target.value)}
                placeholder="e.g. Diabetes Mellitus Type 2"
                className="input-field"
              />
            </div>
          </fieldset>

          {/* Autopsy Field */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Autopsy Performed?</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="radio"
                  name="autopsy"
                  value="YES"
                  checked={autopsy === 'YES'}
                  onChange={() => setAutopsy('YES')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="radio"
                  name="autopsy"
                  value="NO"
                  checked={autopsy === 'NO'}
                  onChange={() => setAutopsy('NO')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                No
              </label>
            </div>
          </div>

          {/* Maternal Condition */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Maternal Condition (For Females aged 15-49 years)</label>
              {!isEligibleForMaternalCondition && (
                <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded">
                  Not applicable for current age/sex profile
                </span>
              )}
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 ${!isEligibleForMaternalCondition ? 'opacity-50 pointer-events-none' : ''}`}>
              {[
                { id: 'a', label: 'a. Pregnant, not in labour' },
                { id: 'b', label: 'b. Pregnant, in labour' },
                { id: 'c', label: 'c. Less than 42 days after delivery' },
                { id: 'd', label: 'd. 42 days to 1 year after delivery' },
                { id: 'e', label: 'e. None of the choices' },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-md transition">
                  <input
                    type="radio"
                    name="maternalCondition"
                    value={item.id}
                    checked={maternalCondition === item.id}
                    onChange={(e) => setMaternalCondition(e.target.value)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-slate-700 font-medium">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Attendant Category */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Attendant Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              {[
                { id: 'PRIVATE_PHYSICIAN', label: 'Private Physician' },
                { id: 'PUBLIC_HEALTH_OFFICER', label: 'Public Health Officer' },
                { id: 'HOSPITAL_AUTHORITY', label: 'Hospital Authority' },
                { id: 'NONE', label: 'None' },
                { id: 'OTHERS', label: 'Others' },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-md transition">
                  <input
                    type="radio"
                    name="attendantType"
                    value={item.id}
                    checked={attendantType === item.id}
                    onChange={(e) => setAttendantType(e.target.value)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-slate-700 font-medium">{item.label}</span>
                </label>
              ))}
            </div>

            {attendantType === 'OTHERS' && (
              <input
                type="text"
                value={attendantOthers}
                onChange={(e) => setAttendantOthers(e.target.value)}
                placeholder="Specify Attendant Title / Role"
                className="input-field"
              />
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-600 block">Attended From</span>
                <input type="date" value={attendedFrom} onChange={(e) => setAttendedFrom(e.target.value)} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-600 block">Attended To</span>
                <input type="date" value={attendedTo} onChange={(e) => setAttendedTo(e.target.value)} className="input-field text-xs" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* CARD 5: DEATH BY EXTERNAL CAUSES */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.18 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">5. Death by External Causes</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Manner of Death</label>
              <input
                type="text"
                value={mannerOfDeath}
                onChange={(e) => setMannerOfDeath(e.target.value)}
                placeholder="e.g. Homicide, Suicide, Accident"
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Place of Occurrence</label>
              <input
                type="text"
                value={placeOfExternalCause}
                onChange={(e) => setPlaceOfExternalCause(e.target.value)}
                placeholder="e.g. Home, Construction Site, Highway"
                className="input-field"
              />
            </div>
          </div>
        </motion.div>

        {/* CARD 6: CERTIFICATION OF INFORMANT */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserCheck className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">6. Certification of Informant</h3>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <input type="text" value={informantFirstName} onChange={(e) => setInformantFirstName(e.target.value)} placeholder="First Name *" className="input-field" required />
            <input type="text" value={informantMiddleName} onChange={(e) => setInformantMiddleName(e.target.value)} placeholder="Middle Name" className="input-field" />
            <input type="text" value={informantLastName} onChange={(e) => setInformantLastName(e.target.value)} placeholder="Last Name *" className="input-field" required />
            <input type="text" value={informantExtension} onChange={(e) => setInformantExtension(e.target.value)} placeholder="Ext (Jr, III)" className="input-field" />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={informantRelationship}
              onChange={(e) => setInformantRelationship(e.target.value)}
              placeholder="Relationship with Deceased (e.g. Spouse, Son)"
              className="input-field"
            />
            <input
              type="text"
              value={informantBarangay}
              onChange={(e) => setInformantBarangay(e.target.value)}
              placeholder="Informant Barangay"
              className="input-field"
            />
            <input
              type="text"
              value={informantCity}
              onChange={(e) => setInformantCity(e.target.value)}
              placeholder="Informant City / Province"
              className="input-field"
            />
          </div>
        </motion.div>

        {/* CARD 7: CLINICAL REMARKS / REGISTRY NOTES */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.25 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MessageSquare className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">7. Clinical Remarks & Registry Notes</h3>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="State any remarks like attending physician license details, witness credentials..."
            rows={3}
            className="input-field resize-none py-2.5"
          />
        </motion.div>

        {/* Duplicate check status notification */}
        {checkingDuplicate ? (
          <div className="text-xs text-slate-400 animate-pulse flex items-center gap-2 px-2">
            <AlertCircle className="h-4 w-4" /> Running live background duplicate registry check...
          </div>
        ) : isDuplicate ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex gap-3 items-start shadow-2xs">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm">Potential Duplicate Entry Detected</span>
              <p className="opacity-90 mt-0.5">
                A certificate with matching details (Deceased: <span className="font-bold">{fullDeceasedName}</span>, Date of Death: <span className="font-bold">{dateOfDeath}</span>) is already registered under certificate <span className="font-bold">{duplicateNum}</span>.
              </p>
            </div>
          </div>
        ) : fullDeceasedName && dateOfDeath ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-xs flex gap-3 items-start shadow-2xs">
            <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm">Unique Entry Verified</span>
              <p className="opacity-90 mt-0.5">No matching active records found. This entry is clear for drafting.</p>
            </div>
          </div>
        ) : null}

        {/* Form Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/dashboard/death" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary bg-rose-700 hover:bg-rose-800 text-white font-bold px-6 focus:ring-rose-500 shadow-xs"
          >
            {submitting ? 'Saving Draft...' : 'Save Draft Record'}
          </button>
        </div>

      </form>
    </div>
  );
}