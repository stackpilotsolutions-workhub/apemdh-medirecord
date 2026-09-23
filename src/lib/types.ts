export type UserRole = 'ADMIN' | 'MRO' | 'PHYSICIAN' | 'CRO' | 'LCR';

export type UserStatus = 'ACTIVE' | 'DEACTIVATED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword?: boolean;
  title_position?: string;
  address?: string;
  createdAt: string;
}

export type RecordStatus =
  | 'DRAFT'
  | 'PENDING_CERTIFICATION'
  | 'PENDING_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'SUBMITTED_LCR'
  | 'ARCHIVED';

export interface BirthRecordDetailsJSON {
  child?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    extension?: string | null;
    birthOrder?: string;
    typeOfBirth?: string;
    birthWeightGrams?: number | string;
    multipleBirthOrder?: string;
  };
  mother?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    extension?: string | null;
    age?: number | string;
    occupation?: string;
    religion?: string;
    citizenship?: string;
    childrenBornAlive?: number | string;
    childrenLiving?: number | string;
    childrenDead?: number | string;
    residence?: {
      street?: string;
      city?: string;
      province?: string;
      country?: string;
    };
  };
  father?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    extension?: string | null;
    age?: number | string;
    occupation?: string;
    religion?: string;
    citizenship?: string;
    residence?: {
      street?: string;
      city?: string;
      province?: string;
      country?: string;
    };
  };
  marriage?: {
    isMarried?: boolean;
    date?: string;
    city?: string;
    province?: string;
    country?: string;
  };
  attendant?: {
    type?: string;
    specificTitle?: string | null;
    name?: string;
    position?: string;
    address?: string;
    certifiedAt?: string;
    certifiedBy?: string;
  };
  informant?: {
    name?: string;
    relationship?: string;
    address?: string;
    date?: string;
    isParentShortcut?: string;
  };
  remarks?: string;
  isDuplicateFlag?: boolean;
}

export interface BirthRecord {
  id: string;
  certificateNumber: string;

  // --- RAW DATABASE JSON PAYLOAD ---
  details?: BirthRecordDetailsJSON;

  // --- 1. CHILD DEMOGRAPHICS ---
  childName: string; // Pre-formatted full name for search/listings
  childFirstName?: string;
  childMiddleName?: string;
  childLastName?: string;
  childExtension?: string;
  childGender: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate: string;
  birthTime: string;

  // Place of Birth
  placeOfBirth: string; // Pre-formatted full location string
  hospitalName?: string;
  birthCity?: string;
  birthProvince?: string;

  // Delivery & Physical Details
  typeOfBirth?: 'Single' | 'Twin' | 'Triplet' | 'Other' | string;
  multipleBirthOrder?: string;
  birthOrder?: string;
  birthWeightGrams?: string;

  // --- 2. MOTHER'S MAIDEN INFORMATION ---
  motherName: string; // Pre-formatted full name
  motherFirstName?: string;
  motherMiddleName?: string;
  motherLastName?: string;
  motherExtension?: string;
  motherCitizenship?: string;
  motherReligion?: string;
  motherOccupation?: string;
  motherAge?: string;
  motherChildrenBornAlive?: string;
  motherChildrenLiving?: string;
  motherChildrenDead?: string;
  motherAddress?: string;
  motherStreet?: string;
  motherCity?: string;
  motherProvince?: string;
  motherCountry?: string;

  // --- 3. FATHER'S INFORMATION ---
  fatherName: string; // Pre-formatted full name
  fatherFirstName?: string;
  fatherMiddleName?: string;
  fatherLastName?: string;
  fatherExtension?: string;
  fatherCitizenship?: string;
  fatherReligion?: string;
  fatherOccupation?: string;
  fatherAge?: string;
  fatherAddress?: string;
  fatherStreet?: string;
  fatherCity?: string;
  fatherProvince?: string;
  fatherCountry?: string;

  // --- 4. MARRIAGE OF PARENTS ---
  parentsNotMarried?: boolean;
  marriageDate?: string;
  marriageCity?: string;
  marriageProvince?: string;
  marriageCountry?: string;

  // --- 5. ATTENDANT & CERTIFICATION SNAPSHOT ---
  attendantType?: 'Physician' | 'Nurse' | 'Midwife' | 'Hilot' | 'Others' | string;
  attendantOthersSpecify?: string;
  attendantName?: string;      // Certified Physician Full Name Snapshot
  attendantPosition?: string;  // Title / Position Snapshot (e.g. OB-GYN)
  attendantAddress?: string;   // Hospital / Medical Practice Address Snapshot

  // --- 6. INFORMANT CERTIFICATION ---
  informantIsParent?: 'NONE' | 'MOTHER' | 'FATHER';
  informantName?: string;
  informantRelationship?: string;
  informantAddress?: string;
  informantDate?: string;

  // --- 7. WORKFLOW & AUDIT ---
  status: RecordStatus;
  createdBy?: string;
  certifiedBy?: string; // Physician name/ID
  certifiedAt?: string;
  verifiedBy?: string; // MRO name/ID
  verifiedAt?: string;
  approvedBy?: string; // CRO name/ID
  approvedAt?: string;
  submittedBy?: string; // LCR name/ID
  submittedAt?: string;
  archivedAt?: string;
  supportingDocuments: string[]; // Filenames or Supabase Storage URLs
  duplicateStatus: 'UNIQUE' | 'POTENTIAL_DUPLICATE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateBirthRecordInput = Omit<
  BirthRecord,
  'id' | 'certificateNumber' | 'status' | 'supportingDocuments' | 'duplicateStatus' | 'createdAt' | 'updatedAt'
>;

export interface DeathRecordStructuredDetails {
  deceased: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    extension?: string | null;
    sex: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth?: string | null;
    dateOfDeath: string;
    ageBreakdown: {
      years: number;
      months: number;
      days: number;
      hours: number;
      minutes: number;
    };
    civilStatus: string;
    religion?: string | null;
    citizenship: string;
    occupation?: string | null;
    residence: {
      barangay?: string | null;
      city?: string | null;
      province?: string | null;
      country: string;
    };
  };
  placeOfDeath: {
    hospital: string;
    barangay?: string | null;
    city?: string | null;
    province?: string | null;
  };
  parents: {
    father?: {
      firstName: string;
      middleName?: string | null;
      lastName: string;
    } | null;
    mother?: {
      firstName: string;
      middleName?: string | null;
      lastName: string;
    } | null;
  };
  causesOfDeath?: {
    immediateCause?: string | null;
    antecedentCause?: string | null;
    underlyingCause?: string | null;
    otherConditions?: string | null;
  } | null;
  autopsy: 'YES' | 'NO';
  maternalCondition?: string | null;
  externalCauses: {
    mannerOfDeath?: string | null;
    placeOfOccurrence?: string | null;
  };
  attendant: {
    type: string;
    otherSpecify?: string | null;
    duration: {
      from?: string | null;
      to?: string | null;
    };
  };
  informant: {
    name: string;
    relationship?: string | null;
    address: {
      barangay?: string | null;
      city?: string | null;
      province?: string | null;
    };
  };
  isDuplicateFlag: boolean;
}

export interface DeathRecord {
  id: string;
  certificateNumber: string;
  deceasedName: string;
  deceasedAge: number;
  deceasedGender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfDeath: string;
  placeOfDeath: string;
  causeOfDeath: string;
  icd10Code: string;
  status: RecordStatus;
  createdBy: string; // 👈 Added createdBy field
  certifiedBy?: string;
  certifiedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  submittedBy?: string;
  submittedAt?: string;
  archivedAt?: string;
  supportingDocuments: string[];
  duplicateStatus: 'UNIQUE' | 'POTENTIAL_DUPLICATE';
  notes?: string; // Plain text clinical remarks
  details?: DeathRecordStructuredDetails; // Dedicated JSONB column
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'RECORD_CREATE'
    | 'RECORD_UPDATE'
    | 'RECORD_CERTIFY'
    | 'RECORD_VERIFY'
    | 'RECORD_APPROVE'
    | 'RECORD_SUBMIT'
    | 'RECORD_ARCHIVE'
    | 'FILE_UPLOAD'
    | 'FILE_DOWNLOAD'
    | 'PASSWORD_CHANGE'
    | 'USER_CREATE'
    | 'USER_EDIT'
    | 'USER_STATUS_CHANGE'
    | 'PASSWORD_RESET';
  description: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemSettings {
  storageUsageBytes: number; // Cloudflare R2 usage mock
  maxStorageBytes: number;   // 10 GB limit (10 * 1024 * 1024 * 1024)
  uploadsDisabled: boolean;
}
