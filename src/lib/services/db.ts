import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { User, BirthRecord, DeathRecord, AuditLog, SystemSettings, UserRole } from '../types';

const DB_FILE_PATH = path.join(process.cwd(), 'mock-db.json');

// Supabase client initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  birth_records: BirthRecord[];
  death_records: DeathRecord[];
  audit_logs: AuditLog[];
  settings: SystemSettings;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const INITIAL_DATA: DatabaseSchema = {
  users: [
    {
      id: 'usr_admin',
      name: 'Hospital Administrator',
      email: 'admin@medirecord.ph',
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: true,
      title_position: 'Chief Administrative Officer',
      passwordHash: hashPassword('AdminPassword123!'),
      createdAt: new Date('2026-07-01T08:00:00Z').toISOString(),
    },
    {
      id: 'usr_mro',
      name: 'Maria Santos (MRO)',
      email: 'mro@apemdh.gov',
      role: 'MRO',
      status: 'ACTIVE',
      mustChangePassword: true,
      title_position: 'Medical Records Officer II',
      passwordHash: hashPassword('MroPassword123!'),
      createdAt: new Date('2026-07-02T09:00:00Z').toISOString(),
    },
    {
      id: 'usr_physician',
      name: 'Dr. Jose Rizal (Physician)',
      email: 'physician@apemdh.gov',
      role: 'PHYSICIAN',
      status: 'ACTIVE',
      mustChangePassword: true,
      passwordHash: hashPassword('PhysicianPassword123!'),
      createdAt: new Date('2026-07-02T10:00:00Z').toISOString(),
    },
    {
      id: 'usr_cro',
      name: 'Juan Dela Cruz (CRO)',
      email: 'cro@apemdh.gov',
      role: 'CRO',
      status: 'ACTIVE',
      mustChangePassword: true,
      passwordHash: hashPassword('CroPassword123!'),
      createdAt: new Date('2026-07-02T11:00:00Z').toISOString(),
    },
    {
      id: 'usr_lcr',
      name: 'LCR Gonzaga Officer',
      email: 'lcr@apemdh.gov',
      role: 'LCR',
      status: 'ACTIVE',
      mustChangePassword: true,
      passwordHash: hashPassword('LcrPassword123!'),
      createdAt: new Date('2026-07-02T12:00:00Z').toISOString(),
    },
  ],
  birth_records: [],
  death_records: [],
  audit_logs: [],
  settings: {
    storageUsageBytes: 0,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    uploadsDisabled: false,
  },
};

/**
 * Helper function to parse/normalize `notes` and `details`.
 * Handles historical JSON payloads stored inside `notes` and extracts pure string remarks.
 */
function processRecordNotesAndDetails(notesInput: any, detailsInput: any) {
  let parsedDetails: any = detailsInput || null;
  let remarksText: string = '';

  // If notesInput is a raw JSON string containing legacy form payloads
  if (typeof notesInput === 'string' && notesInput.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(notesInput);
      parsedDetails = parsedDetails || parsed;
      remarksText = parsed.remarks || '';
    } catch {
      remarksText = notesInput;
    }
  } else if (typeof notesInput === 'object' && notesInput !== null) {
    parsedDetails = parsedDetails || notesInput;
    remarksText = notesInput.remarks || '';
  } else {
    remarksText = notesInput || '';
  }

  // Fallback check if remarks exist inside parsed details
  if (!remarksText && parsedDetails && typeof parsedDetails === 'object' && parsedDetails.remarks) {
    remarksText = parsedDetails.remarks;
  }

  return { remarksText, parsedDetails };
}

// Main DB Access helpers (Async hybrid model)
export async function getDb(): Promise<DatabaseSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('Database service can only be executed on the server side.');
  }

  // --- CASE A: SUPABASE CLOUD DATABASE ---
  if (supabase) {
    try {
      const [usersRes, birthRes, deathRes, auditRes, settingsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('birth_records').select('*'),
        supabase.from('death_records').select('*'),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 'system').single(),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (birthRes.error) throw birthRes.error;
      if (deathRes.error) throw deathRes.error;
      if (auditRes.error) throw auditRes.error;
      if (settingsRes.error && settingsRes.status !== 406) throw settingsRes.error;

      // Map users
      const users = (usersRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        status: u.status,
        mustChangePassword: !!u.must_change_password,
        title_position: u.title_position,
        address: u.address,
        passwordHash: u.password_hash,
        createdAt: u.created_at,
      }));

      // Map birth records
      const birth_records = (birthRes.data || []).map((r: any) => {
        const { remarksText, parsedDetails } = processRecordNotesAndDetails(r.notes, r.details);

        return {
          id: r.id,
          certificateNumber: r.certificate_number,
          childName: r.child_name,
          childGender: r.child_gender,
          birthDate: r.birth_date,
          birthTime: r.birth_time,
          placeOfBirth: r.place_of_birth,
          motherName: r.mother_name,
          fatherName: r.father_name,
          status: r.status,
          notes: remarksText,
          details: parsedDetails,

          createdBy: r.created_by,

          // Attendant certification snapshot mapping
          attendantName: r.attendant_name,
          attendantPosition: r.attendant_position,
          attendantAddress: r.attendant_address,

          // Workflow audit trail
          certifiedBy: r.certified_by,
          certifiedAt: r.certified_at,
          verifiedBy: r.verified_by,
          verifiedAt: r.verified_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          submittedBy: r.submitted_by,
          submittedAt: r.submitted_at,
          archivedAt: r.archived_at,
          supportingDocuments: r.supporting_documents || [],
          duplicateStatus: r.duplicate_status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      });

      // Map death records
      const death_records = (deathRes.data || []).map((r: any) => {
        const { remarksText, parsedDetails } = processRecordNotesAndDetails(r.notes, r.details);

        return {
          id: r.id,
          certificateNumber: r.certificate_number,
          deceasedName: r.deceased_name,
          deceasedAge: r.deceased_age,
          deceasedGender: r.deceased_gender,
          dateOfDeath: r.date_of_death,
          placeOfDeath: r.place_of_death,
          causeOfDeath: r.cause_of_death,
          icd10Code: r.icd10_code,
          status: r.status,
          notes: remarksText,
          details: parsedDetails,

          createdBy: r.created_by, 

          certifiedBy: r.certified_by,
          certifiedAt: r.certified_at,
          verifiedBy: r.verified_by,
          verifiedAt: r.verified_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          submittedBy: r.submitted_by,
          submittedAt: r.submitted_at,
          archivedAt: r.archived_at,
          supportingDocuments: r.supporting_documents || [],
          duplicateStatus: r.duplicate_status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      });

      // Map audit logs
      const audit_logs = (auditRes.data || []).map((l: any) => ({
        id: l.id,
        userId: l.user_id,
        userEmail: l.user_email,
        userRole: l.user_role as UserRole,
        action: l.action,
        description: l.description,
        ipAddress: l.ip_address,
        timestamp: l.timestamp,
      }));

      // Map settings
      const settings: SystemSettings = settingsRes.data
        ? {
            storageUsageBytes: Number(settingsRes.data.storage_usage_bytes),
            maxStorageBytes: Number(settingsRes.data.max_storage_bytes),
            uploadsDisabled: !!settingsRes.data.uploads_disabled,
          }
        : {
            storageUsageBytes: 0,
            maxStorageBytes: 10 * 1024 * 1024 * 1024,
            uploadsDisabled: false,
          };

      return { users, birth_records, death_records, audit_logs, settings };
    } catch (err) {
      console.error('Supabase fetch failed, falling back to local storage:', err);
    }
  }

  // --- CASE B: LOCAL JSON FILE FALLBACK ---
  if (!fs.existsSync(DB_FILE_PATH)) {
    await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }

  try {
    const dataStr = await fs.promises.readFile(DB_FILE_PATH, 'utf-8');
    return JSON.parse(dataStr);
  } catch (error) {
    console.error('Failed to read mock db file, resetting to initial data', error);
    await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
}

export async function saveDb(db: DatabaseSchema): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('Database service can only be executed on the server side.');
  }

  // --- CASE A: SUPABASE CLOUD DATABASE ---
  if (supabase) {
    try {
      // 1. Upsert users
      const mappedUsers = db.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        must_change_password: u.mustChangePassword,
        title_position: u.title_position,
        address: u.address,
        password_hash: u.passwordHash,
        created_at: u.createdAt,
      }));
      await supabase.from('users').upsert(mappedUsers);

      // 2. Upsert birth records
      const mappedBirth = db.birth_records.map((r: any) => {
        const { remarksText, parsedDetails } = processRecordNotesAndDetails(r.notes, r.details);

        return {
          id: r.id,
          certificate_number: r.certificateNumber,
          child_name: r.childName,
          child_gender: r.childGender,
          birth_date: r.birthDate,
          birth_time: r.birthTime,
          place_of_birth: r.placeOfBirth,
          mother_name: r.motherName,
          father_name: r.fatherName,
          status: r.status,
          notes: remarksText,
          details: parsedDetails,

          created_by: r.createdBy,

          attendant_name: r.attendantName,
          attendant_position: r.attendantPosition,
          attendant_address: r.attendantAddress,

          certified_by: r.certifiedBy,
          certified_at: r.certifiedAt,
          verified_by: r.verifiedBy,
          verified_at: r.verifiedAt,
          approved_by: r.approvedBy,
          approved_at: r.approvedAt,
          submitted_by: r.submittedBy,
          submitted_at: r.submittedAt,
          archived_at: r.archivedAt,
          supporting_documents: r.supportingDocuments,
          duplicate_status: r.duplicateStatus,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        };
      });
      await supabase.from('birth_records').upsert(mappedBirth);

      // 3. Upsert death records
      const mappedDeath = db.death_records.map((r: any) => {
        const { remarksText, parsedDetails } = processRecordNotesAndDetails(r.notes, r.details);

        return {
          id: r.id,
          certificate_number: r.certificateNumber,
          deceased_name: r.deceasedName,
          deceased_age: r.deceasedAge,
          deceased_gender: r.deceasedGender,
          date_of_death: r.dateOfDeath,
          place_of_death: r.placeOfDeath,
          cause_of_death: r.causeOfDeath,
          icd10_code: r.icd10Code,
          status: r.status,
          notes: remarksText,
          details: parsedDetails,

          created_by: r.createdBy, // 👈 Maps app property (r.createdBy) -> Supabase column (created_by)

          certified_by: r.certifiedBy,
          certified_at: r.certifiedAt,
          verified_by: r.verifiedBy,
          verified_at: r.verifiedAt,
          approved_by: r.approvedBy,
          approved_at: r.approvedAt,
          submitted_by: r.submittedBy,
          submitted_at: r.submittedAt,
          archived_at: r.archivedAt,
          supporting_documents: r.supportingDocuments,
          duplicate_status: r.duplicateStatus,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        };
      });
      await supabase.from('death_records').upsert(mappedDeath);

      // 4. Upsert audit logs
      if (db.audit_logs.length > 0) {
        const mappedLogs = db.audit_logs.slice(0, 100).map((l) => ({
          id: l.id,
          user_id: l.userId,
          user_email: l.userEmail,
          user_role: l.userRole,
          action: l.action,
          description: l.description,
          ip_address: l.ipAddress || null,
          timestamp: l.timestamp,
        }));
        await supabase.from('audit_logs').upsert(mappedLogs);
      }

      // 5. Upsert system settings
      await supabase.from('settings').upsert({
        id: 'system',
        storage_usage_bytes: db.settings.storageUsageBytes,
        max_storage_bytes: db.settings.maxStorageBytes,
        uploads_disabled: db.settings.uploadsDisabled,
      });

      return;
    } catch (err) {
      console.error('Supabase write failed, falling back to local storage:', err);
    }
  }

  // Fallback to local JSON file
  await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
}