'use server';

import { getDb, saveDb } from '@/lib/services/db';
import { getCurrentUser, logAuditEvent } from '@/lib/services/auth';
import { BirthRecord, RecordStatus } from '@/lib/types';
import { uploadFile } from '@/lib/services/storage';

export async function getBirthRecordForPDFAction(id: string): Promise<BirthRecord | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  const record = db.birth_records.find((r) => r.id === id);

  if (!record) return null;

  return record;
}

export async function getBirthRecordsAction(
  search?: string,
  status?: string
): Promise<BirthRecord[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  let list = db.birth_records;

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (r) =>
        r.childName.toLowerCase().includes(q) ||
        r.certificateNumber.toLowerCase().includes(q) ||
        r.motherName.toLowerCase().includes(q) ||
        r.fatherName.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (status && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  }

  // If user is LCR, they can only see records that are PENDING_APPROVAL, SUBMITTED_LCR, or ARCHIVED.
  if (user.role === 'LCR') {
    list = list.filter((r) => ['SUBMITTED_LCR', 'ARCHIVED'].includes(r.status));
  }

  // If user is Physician, they might focus on certification but see all
  // If user is CRO, they review pending approval and above
  
  return list;
}

export async function getBirthRecordAction(id: string): Promise<BirthRecord | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  const record = db.birth_records.find((r) => r.id === id);
  return record || null;
}

export async function checkDuplicateBirthAction(
  childName: string,
  motherName: string,
  birthDate: string
): Promise<{ isDuplicate: boolean; duplicateRecord?: BirthRecord }> {
  const db = await getDb();
  const cleanStr = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  
  const duplicate = db.birth_records.find(
    (r) =>
      cleanStr(r.childName) === cleanStr(childName) &&
      cleanStr(r.motherName) === cleanStr(motherName) &&
      r.birthDate === birthDate
  );

  return {
    isDuplicate: !!duplicate,
    duplicateRecord: duplicate,
  };
}

export async function createBirthRecordAction(
  data: Omit<BirthRecord, 'id' | 'certificateNumber' | 'status' | 'supportingDocuments' | 'duplicateStatus' | 'createdAt' | 'updatedAt'>
): Promise<BirthRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'MRO' && user.role !== 'ADMIN') {
    throw new Error('Only Medical Records Officers or Admins can register birth certificates.');
  }


  // 🧪 TEST LOG 2: Inspect all structured JSON details inside `notes`
  // try {
  //   if (data.notes) {
  //     const parsedDetails = JSON.parse(data.notes);
  //     console.log('\nPARSED DETAILS FROM NOTES:');
  //     console.dir(parsedDetails, { depth: null, colors: true });
  //   } else {
  //     console.warn('data.notes is empty!');
  //   }
  // } catch (err) {
  //   console.error('Failed to parse data.notes as JSON:', err);
  // }
  // console.log('==================================================\n');

  const db = await getDb();

  // Generate certificate number: BR-YYYYMMDD-XXXX
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const seq = String(db.birth_records.length + 1).padStart(4, '0');
  const certificateNumber = `BR-${today}-${seq}`;

  // Duplicate Check
  const { isDuplicate } = await checkDuplicateBirthAction(data.childName, data.motherName, data.birthDate);
  const duplicateStatus = isDuplicate ? 'POTENTIAL_DUPLICATE' : 'UNIQUE';

  const newRecord: BirthRecord = {
    ...data,
    id: `br_${Date.now()}`,
    certificateNumber,
    status: 'DRAFT', 
    createdBy: user.name,
    supportingDocuments: [],
    duplicateStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Insert into local persistent database service
  db.birth_records.unshift(newRecord);
  await saveDb(db);

  // Log system audit event
  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_CREATE',
    `Created birth certificate draft for ${newRecord.childName} (${certificateNumber})`
  );

  return newRecord;
}

export async function updateBirthRecordAction(
  id: string,
  updates: Partial<BirthRecord>
): Promise<BirthRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  const idx = db.birth_records.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Record not found.');

  const original = db.birth_records[idx];

  // Perform checks: DRAFT is editable by MRO/ADMIN.
  if (original.status === 'ARCHIVED') {
    throw new Error('Archived records cannot be modified.');
  }

  const updatedRecord: BirthRecord = {
    ...original,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.birth_records[idx] = updatedRecord;
  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_UPDATE',
    `Updated birth record fields for ${updatedRecord.childName} (${updatedRecord.certificateNumber})`
  );

  return updatedRecord;
}

export async function submitToPhysicianAction(id: string): Promise<BirthRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'MRO' && user.role !== 'ADMIN')) throw new Error('Unauthorized');

  const db = await getDb();
  const record = db.birth_records.find(r => r.id === id);
  if (!record) throw new Error('Record not found');

  record.status = 'PENDING_CERTIFICATION';
  record.updatedAt = new Date().toISOString();
  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_UPDATE',
    `Submitted birth record ${record.childName} to Physician for certification`
  );

  return record;
}

export interface AttendantCertificationData {
  attendant_name: string;
  attendant_position: string;
  attendant_address: string;
}

export async function certifyBirthRecordAction(
  id: string,
  data?: AttendantCertificationData
): Promise<BirthRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'PHYSICIAN' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only Physicians can certify medical birth details.');
  }

  const db = await getDb();
  const record = db.birth_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  const now = new Date().toISOString();

  // 1. Basic workflow state updates
  record.status = 'PENDING_VERIFICATION'; // Moves record back to MRO for uploads/checks
  record.certifiedBy = user.name;
  record.certifiedAt = now;
  record.updatedAt = now;

  // 2. Persist Attendant Certification snapshot data onto top-level fields
  if (data) {
    record.attendantName = data.attendant_name;
    record.attendantPosition = data.attendant_position;
    record.attendantAddress = data.attendant_address;
  }

  // 3. Optional: Sync certification details into structured JSON inside `notes`
  if (record.notes) {
    try {
      const parsedNotes = JSON.parse(record.notes);
      parsedNotes.attendant = {
        ...parsedNotes.attendant,
        name: data?.attendant_name || record.attendantName || user.name,
        title: data?.attendant_position || record.attendantPosition,
        address: data?.attendant_address || record.attendantAddress,
        certifiedAt: now,
      };
      record.notes = JSON.stringify(parsedNotes);
    } catch (err) {
      console.warn('⚠️ Could not sync attendant details to JSON notes:', err);
    }
  }

  // Save changes to persistent DB
  await saveDb(db);

  // Audit log event
  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_CERTIFY',
    `Certified birth details & attendant info for ${record.childName} (${record.certificateNumber})`
  );

  return record;
}

export async function verifyBirthRecordAction(id: string, documents: string[]): Promise<BirthRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'MRO' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only MROs can verify records.');
  }

  const db = await getDb();
  const record = db.birth_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  record.status = 'PENDING_APPROVAL'; // Verified, goes to CRO for final signing
  record.verifiedBy = user.name;
  record.verifiedAt = new Date().toISOString();
  record.supportingDocuments = [...record.supportingDocuments, ...documents];
  record.updatedAt = new Date().toISOString();

  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_VERIFY',
    `Verified birth record completeness for ${record.childName} (${record.certificateNumber})`
  );

  return record;
}

export async function approveBirthRecordAction(id: string): Promise<BirthRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'CRO' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only CROs can approve registrations.');
  }

  const db = await getDb();
  const record = db.birth_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  record.status = 'SUBMITTED_LCR'; // Approved by CRO, dispatched to LCR
  record.approvedBy = user.name;
  record.approvedAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();

  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_APPROVE',
    `Approved birth registration for ${record.childName} and submitted to LCR`
  );

  return record;
}

export async function finalizeLCRBirthAction(id: string): Promise<BirthRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'LCR' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only LCR users can finalize/archive submissions.');
  }

  const db = await getDb();
  const record = db.birth_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  record.status = 'ARCHIVED'; // Archived by LCR
  record.submittedBy = user.name;
  record.submittedAt = new Date().toISOString();
  record.archivedAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();

  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_SUBMIT',
    `Finalized and archived birth certificate for ${record.childName} inside Local Civil Registry`
  );

  return record;
}

export async function uploadBirthFileAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; record?: BirthRecord }> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    // Perform upload
    const res = await uploadFile(file);

    const db = await getDb();
    const record = db.birth_records.find((r) => r.id === id);
    if (!record) throw new Error('Record not found.');

    const docEntry = `${file.name}|${res.url}`;
    record.supportingDocuments.push(docEntry);
    record.updatedAt = new Date().toISOString();
    await saveDb(db);

    await logAuditEvent(
      user.id,
      user.email,
      user.role,
      'FILE_UPLOAD',
      `Uploaded document "${file.name}" for birth record ${record.childName}`
    );

    return { success: true, record };
  } catch (err: any) {
    console.error('uploadBirthFileAction error:', err);
    return { success: false, error: err.message || 'File upload failed.' };
  }
}

export async function getCreatorTitlePositionAction(identifier: string): Promise<string> {
  if (!identifier) return '';

  const db = await getDb();
  const target = identifier.trim().toLowerCase();

  const creator = db.users.find(
    (u) =>
      u.name?.toLowerCase() === target ||
      u.email?.toLowerCase() === target ||
      u.id?.toLowerCase() === target
  );

  return creator?.title_position || creator?.role || '';
}


