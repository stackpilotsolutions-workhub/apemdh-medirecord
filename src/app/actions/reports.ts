'use server';

import { getDb } from '@/lib/services/db';
import { getCurrentUser } from '@/lib/services/auth';

export interface ReportRecord {
  certificateNumber: string;
  type: 'BIRTH' | 'DEATH';
  name: string;
  date: string;
  status: string;
  details: string;
  createdAt: string;
  childGender?: 'MALE' | 'FEMALE' | string;
  deceasedGender?: 'MALE' | 'FEMALE' | string;
}

export async function generateReportDataAction(
  startDate?: string,
  endDate?: string,
  typeFilter: 'ALL' | 'BIRTHS' | 'DEATHS' = 'ALL',
  statusFilter: string = 'ALL'
): Promise<ReportRecord[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const db = await getDb();
  const records: ReportRecord[] = [];

  // 1. Process Births
  if (typeFilter === 'ALL' || typeFilter === 'BIRTHS') {
    db.birth_records.forEach((b) => {
      records.push({
        certificateNumber: b.certificateNumber,
        type: 'BIRTH',
        name: b.childName,
        date: b.birthDate,
        status: b.status,
        details: `Mother: ${b.motherName}, Father: ${b.fatherName || 'N/A'}`,
        createdAt: b.createdAt,
        childGender: b.childGender, 
      });
    });
  }

  // 2. Process Deaths
  if (typeFilter === 'ALL' || typeFilter === 'DEATHS') {
    db.death_records.forEach((d) => {
      records.push({
        certificateNumber: d.certificateNumber,
        type: 'DEATH',
        name: d.deceasedName,
        date: d.dateOfDeath,
        status: d.status,
        details: `Age: ${d.deceasedAge}, Cause: ${d.causeOfDeath || 'N/A'} (ICD-10: ${d.icd10Code || 'N/A'})`,
        createdAt: d.createdAt,
        deceasedGender: d.deceasedGender, // Maps the gender property from DB
      });
    });
  }

  // Apply filters
  let filtered = records;

  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter((r) => new Date(r.date) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    filtered = filtered.filter((r) => new Date(r.date) <= end);
  }

  if (statusFilter && statusFilter !== 'ALL') {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }

  // Sort by date descending
  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}