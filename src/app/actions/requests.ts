// src/app/actions/requests.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { generateBirthCertificatePDF,  generateDeathCertificatePDF} from '@/lib/services/pdf';
import { sendApprovalEmail, sendDenialEmail } from '@/lib/services/email';

// Initialize Supabase Client for Server Actions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface ProcessRequestPayload {
  requestId: string;
  status: 'APPROVED' | 'DENIED' | 'REJECTED';
  adminNotes?: string;
  adminName: string;
}

export async function processRequestAction(payload: ProcessRequestPayload) {
  try {
    const { requestId, status, adminNotes, adminName } = payload;

    // 1. Fetch request directly from Supabase 'certificate_requests' table
    const { data: request, error: requestError } = await supabase
      .from('certificate_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Fetch Request Error:', requestError);
      return { success: false, error: 'Request record not found in Supabase' };
    }

    // 2. Handle Approval
    if (status === 'APPROVED') {
      const docType = request.doc_type || 'BIRTH';
      let recordData = null;

        // Query the corresponding records table based on document type
        if (docType === 'BIRTH') {

            // 1. Build JSON path query matching child details
            let query = supabase
                .from('birth_records')
                .select('*')
                .ilike('details->child->>firstName', request.subject_first_name.trim())
                .ilike('details->child->>lastName', request.subject_last_name.trim());

            // 2. Add middle name condition ONLY if provided
            if (request.subject_middle_name?.trim()) {
                query = query.ilike('details->child->>middleName', request.subject_middle_name.trim());
            }

            const { data: birthData, error: searchError } = await query.maybeSingle();

            if (searchError) {
                console.error('[processRequestAction] Supabase Query Error:', searchError);
            }

            recordData = birthData;
            console.log('[processRequestAction] Record Lookup Result:', recordData ? `Found Record ID ${recordData.id}` : 'NOT FOUND');
        } else if (docType === 'DEATH') {
            console.log(`[processRequestAction] Searching death_records for: ${request.subject_first_name} ${request.subject_last_name}`);

            // 1. Build JSON path query matching deceased details
            let query = supabase
              .from('death_records')
              .select('*')
              .ilike('details->deceased->>firstName', request.subject_first_name.trim())
              .ilike('details->deceased->>lastName', request.subject_last_name.trim());

            // 2. Add middle name condition ONLY if provided
            if (request.subject_middle_name?.trim()) {
              query = query.ilike('details->deceased->>middleName', request.subject_middle_name.trim());
            }

            const { data: deathData, error: searchError } = await query.maybeSingle();

            if (searchError) {
              console.error('[processRequestAction] Supabase Death Search Error:', searchError);
            }

            recordData = deathData;
            console.log('[processRequestAction] Death record lookup result:', recordData ? `Found ID ${recordData.id}` : 'NOT FOUND');
          }

        if (!recordData) {
          console.error(`[processRequestAction] No matching ${docType} record found for subject: ${request.subject_first_name} ${request.subject_last_name}`);
          return { 
              success: false, 
              error: `No registered ${docType.toLowerCase()} record was found matching "${request.subject_first_name} ${request.subject_last_name}" in the database.` 
          };
        }

      // Generate PDF based on document type
      const pdfBuffer = docType === 'DEATH' 
        ? await generateDeathCertificatePDF(recordData)
        : await generateBirthCertificatePDF(recordData);

      // Dispatch Approval Email
      await sendApprovalEmail(
        request.email,
        `${request.requester_first_name} ${request.requester_last_name}`,
        pdfBuffer,
        docType
      );

      // Update status in Supabase
      await supabase
        .from('certificate_requests')
        .update({
          status: 'APPROVED',
          admin_notes: adminNotes || 'Approved and issued.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      return { success: true, message: 'Request approved and certificate emailed successfully.' };
    }

    // 3. Handle Denial
    if (status === 'DENIED' || status === 'REJECTED') {
      await sendDenialEmail(
        request.email,
        `${request.requester_first_name} ${request.requester_last_name}`,
        adminNotes || 'Request denied.',
        request.doc_type || 'BIRTH'
      );

      // Update status in Supabase
      await supabase
        .from('certificate_requests')
        .update({
          status: 'REJECTED',
          admin_notes: adminNotes || 'Request denied.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      return { success: true, message: 'Request denied and email notification sent.' };
    }

    return { success: false, error: 'Invalid status provided.' };
  } catch (err: any) {
    console.error('Error in processRequestAction:', err);
    return { success: false, error: err.message || 'Internal Server Error' };
  }
}