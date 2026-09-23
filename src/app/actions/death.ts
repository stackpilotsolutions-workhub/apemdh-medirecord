'use server';

import { getDb, saveDb } from '@/lib/services/db';
import { getCurrentUser, logAuditEvent } from '@/lib/services/auth';
import { DeathRecord, RecordStatus } from '@/lib/types';
import { uploadFile } from '@/lib/services/storage';

// Sample common ICD-10 codes dataset as local fallback
const ICD10_DATASET = [
  { code: 'I21.9', diagnosis: 'Acute Myocardial Infarction, Unspecified (Heart Attack)' },
  { code: 'J18.9', diagnosis: 'Pneumonia, Unspecified' },
  { code: 'E11.9', diagnosis: 'Type 2 Diabetes Mellitus without complications' },
  { code: 'I64', diagnosis: 'Stroke, not specified as hemorrhage or infarction' },
  { code: 'A41.9', diagnosis: 'Sepsis, Unspecified' },
  { code: 'C34.9', diagnosis: 'Malignant Neoplasm of Bronchus or Lung (Lung Cancer)' },
  { code: 'N18.9', diagnosis: 'Chronic Kidney Disease, Unspecified' },
  { code: 'K74.6', diagnosis: 'Other and Unspecified Cirrhosis of Liver' },
  { code: 'I10', diagnosis: 'Essential (Primary) Hypertension' },
  { code: 'C50.9', diagnosis: 'Malignant Neoplasm of Breast, Unspecified' },
];

export async function searchICD10Action(query: string): Promise<{ code: string; diagnosis: string }[]> {
  const cleanQuery = query?.trim();

  // Return top 5 local samples if search input is empty
  if (!cleanQuery) {
    return ICD10_DATASET.slice(0, 5);
  }

  try {
    const response = await fetch(
      `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(cleanQuery)}&maxList=10`
    );

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Index 3 contains arrays formatted as [code, diagnosis]
    const results: [string, string][] = data[3] || [];

    if (results.length > 0) {
      return results.map(([code, diagnosis]) => ({
        code,
        diagnosis,
      }));
    }
  } catch (error) {
    console.warn('ICD-10 API fetch failed, switching to local dataset:', error);
  }

  // Fallback: Local filter if API returns no results or throws an error
  const q = cleanQuery.toLowerCase();
  return ICD10_DATASET.filter(
    (item) => item.code.toLowerCase().includes(q) || item.diagnosis.toLowerCase().includes(q)
  );
}

export async function getDeathRecordsAction(
  search?: string,
  status?: string
): Promise<DeathRecord[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  let list = db.death_records;

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (r) =>
        r.deceasedName.toLowerCase().includes(q) ||
        r.certificateNumber.toLowerCase().includes(q) ||
        r.causeOfDeath.toLowerCase().includes(q) ||
        r.icd10Code.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (status && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  }

  // If user is LCR, limit records
  if (user.role === 'LCR') {
    list = list.filter((r) => ['SUBMITTED_LCR', 'ARCHIVED'].includes(r.status));
  }

  return list;
}

export async function getDeathRecordAction(id: string): Promise<DeathRecord | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  const record = db.death_records.find((r) => r.id === id);
  return record || null;
}

export async function checkDuplicateDeathAction(
  deceasedName: string,
  dateOfDeath: string
): Promise<{ isDuplicate: boolean; duplicateRecord?: DeathRecord }> {
  const db = await getDb();
  const cleanStr = (s: string) => s.toLowerCase().replace(/\s+/g, '');

  const duplicate = db.death_records.find(
    (r) =>
      cleanStr(r.deceasedName) === cleanStr(deceasedName) &&
      r.dateOfDeath === dateOfDeath
  );

  return {
    isDuplicate: !!duplicate,
    duplicateRecord: duplicate,
  };
}

export async function createDeathRecordAction(
  data: Omit<
    DeathRecord,
    | 'id'
    | 'certificateNumber'
    | 'status'
    | 'createdBy'
    | 'supportingDocuments'
    | 'causeOfDeath'
    | 'icd10Code'
    | 'duplicateStatus'
    | 'createdAt'
    | 'updatedAt'
  >
): Promise<DeathRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'MRO' && user.role !== 'ADMIN') {
    throw new Error('Only Medical Records Officers or Admins can register death certificates.');
  }

  // 🧪 TEST LOG 1: Top-level payload fields
  console.log('\n==================================================');
  console.log('📥 INCOMING DATA PAYLOAD:');
  console.log('Top-Level Fields:', {
    deceasedName: data.deceasedName,
    deceasedAge: data.deceasedAge,
    deceasedGender: data.deceasedGender,
    dateOfDeath: data.dateOfDeath,
    placeOfDeath: data.placeOfDeath,
    notes: data.notes,
  });

  // 🧪 TEST LOG 2: Inspect structured JSON inside `details`
  if (data.details) {
    console.log('\n🔍 PARSED DETAILS PAYLOAD:');
    console.dir(data.details, { depth: null, colors: true });
  } else {
    console.warn('⚠️ data.details is empty!');
  }
  console.log('==================================================\n');

  const db = await getDb();

  // Generate certificate number: DR-YYYYMMDD-XXXX
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const seq = String(db.death_records.length + 1).padStart(4, '0');
  const certificateNumber = `DR-${today}-${seq}`;

  // Duplicate Check
  const { isDuplicate } = await checkDuplicateDeathAction(data.deceasedName, data.dateOfDeath);
  const duplicateStatus = isDuplicate ? 'POTENTIAL_DUPLICATE' : 'UNIQUE';

  const extractedCause = '';

  const newRecord: DeathRecord = {
    ...data,
    id: `dr_${Date.now()}`,
    certificateNumber,
    status: 'DRAFT',
    createdBy: user.name || user.id, // 👈 Added createdBy field
    causeOfDeath: extractedCause,
    icd10Code: '',
    supportingDocuments: [],
    duplicateStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.death_records.unshift(newRecord);
  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_CREATE',
    `Created death certificate draft for ${newRecord.deceasedName} (${certificateNumber})`
  );

  return newRecord;
}

export async function updateDeathRecordAction(
  id: string,
  updates: Partial<DeathRecord>
): Promise<DeathRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  const idx = db.death_records.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Record not found.');

  const original = db.death_records[idx];

  if (original.status === 'ARCHIVED') {
    throw new Error('Archived records cannot be modified.');
  }

  const updatedRecord: DeathRecord = {
    ...original,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.death_records[idx] = updatedRecord;
  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_UPDATE',
    `Updated death record fields for ${updatedRecord.deceasedName} (${updatedRecord.certificateNumber})`
  );

  return updatedRecord;
}

export async function submitDeathToPhysicianAction(id: string): Promise<DeathRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'MRO' && user.role !== 'ADMIN')) throw new Error('Unauthorized');

  const db = await getDb();
  const record = db.death_records.find(r => r.id === id);
  if (!record) throw new Error('Record not found');

  record.status = 'PENDING_CERTIFICATION';
  record.updatedAt = new Date().toISOString();
  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_UPDATE',
    `Submitted death record ${record.deceasedName} to Physician for cause-of-death certification`
  );

  return record;
}

export async function certifyDeathRecordAction(
  id: string,
  causeOfDeath: string,
  icd10Code: string
): Promise<DeathRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'PHYSICIAN' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only Physicians can certify causes of death.');
  }

  const db = await getDb();
  const record = db.death_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  record.status = 'PENDING_VERIFICATION';
  record.causeOfDeath = causeOfDeath;
  record.icd10Code = icd10Code;
  record.certifiedBy = user.name;
  record.certifiedAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();

  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_CERTIFY',
    `Certified cause of death (${causeOfDeath}, ICD-10: ${icd10Code}) for ${record.deceasedName} (${record.certificateNumber})`
  );

  return record;
}

export async function verifyDeathRecordAction(id: string, documents: string[]): Promise<DeathRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'MRO' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only MROs can verify records.');
  }

  const db = await getDb();
  const record = db.death_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  record.status = 'PENDING_APPROVAL';
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
    `Verified death record completeness for ${record.deceasedName} (${record.certificateNumber})`
  );

  return record;
}

export async function approveDeathRecordAction(id: string): Promise<DeathRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'CRO' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only CROs can approve registrations.');
  }

  const db = await getDb();
  const record = db.death_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  record.status = 'SUBMITTED_LCR';
  record.approvedBy = user.name;
  record.approvedAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();

  await saveDb(db);

  await logAuditEvent(
    user.id,
    user.email,
    user.role,
    'RECORD_APPROVE',
    `Approved death registration for ${record.deceasedName} and submitted to LCR`
  );

  return record;
}

export async function finalizeLCRDeathAction(id: string): Promise<DeathRecord> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'LCR' && user.role !== 'ADMIN')) {
    throw new Error('Unauthorized. Only LCR users can finalize/archive submissions.');
  }

  const db = await getDb();
  const record = db.death_records.find((r) => r.id === id);
  if (!record) throw new Error('Record not found.');

  record.status = 'ARCHIVED';
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
    `Finalized and archived death certificate for ${record.deceasedName} inside Local Civil Registry`
  );

  return record;
}

export async function uploadDeathFileAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; record?: DeathRecord }> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    // Perform upload
    const res = await uploadFile(file);

    const db = await getDb();
    const record = db.death_records.find((r) => r.id === id);
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
      `Uploaded document "${file.name}" for death record ${record.deceasedName}`
    );

    return { success: true, record };
  } catch (err: any) {
    console.error('uploadDeathFileAction error:', err);
    return { success: false, error: err.message || 'File upload failed.' };
  }
}

export async function getCertifierDetailsAction(identifier: string): Promise<{
    titlePosition: string;
    address: string;
  }> {
  if (!identifier) return { titlePosition: '', address: '' };

  const db = await getDb();
  const target = identifier.trim().toLowerCase();

  const certifier = db.users.find(
    (u) =>
      u.name?.toLowerCase() === target ||
      u.email?.toLowerCase() === target ||
      u.id?.toLowerCase() === target
  );

  return {
    titlePosition: certifier?.title_position || certifier?.role || '',
    address: certifier?.address || '',
  };
}
