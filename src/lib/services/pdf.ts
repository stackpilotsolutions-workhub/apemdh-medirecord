import PDFDocument from 'pdfkit';
import { getDb } from '@/lib/services/db';

async function getUserMetadata(identifier?: string): Promise<{ titlePosition: string; address: string }> {
  if (!identifier) return { titlePosition: '', address: '' };

  try {
    const db = await getDb();
    const target = identifier.trim().toLowerCase();

    const user = db.users.find(
      (u) =>
        u.name?.toLowerCase() === target ||
        u.email?.toLowerCase() === target ||
        u.id?.toLowerCase() === target
    );

    return {
      titlePosition: user?.title_position || user?.role || '',
      address: user?.address || '',
    };
  } catch (error) {
    console.error('Error fetching user metadata in PDF generator:', error);
    return { titlePosition: '', address: '' };
  }
}

export async function generateBirthCertificatePDF(
  record: Record<string, any>
): Promise<Buffer> {
  const creatorName = record.created_by || record.createdBy;
  const approvedBy = record.approved_by || record.approvedBy;
  const submittedBy = record.submitted_by || record.submittedBy;
  const attendantName = record.attendant_name || record.details?.attendant?.name || record.attendantName;

  const [creatorMeta, approverMeta, submitterMeta, attendantMeta] = await Promise.all([
    getUserMetadata(creatorName),
    getUserMetadata(approvedBy),
    getUserMetadata(submittedBy),
    getUserMetadata(attendantName),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 18 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const child = record.details?.child;
    const mother = record.details?.mother;
    const father = record.details?.father;
    const marriage = record.details?.marriage;
    const attendant = record.details?.attendant;
    const informant = record.details?.informant;

    // Resolved Child Name
    const childFirstName = (child?.firstName || record.childFirstName || record.child_name?.split(' ')[0] || '').toUpperCase();
    const childMiddleName = (child?.middleName || record.childMiddleName || '').toUpperCase();
    const rawChildLastName = child?.lastName || record.childLastName || record.child_name?.split(' ').slice(-1)[0] || '';
    const childExt = child?.extension || record.childExtension || '';
    const childLastName = (childExt ? `${rawChildLastName} ${childExt}` : rawChildLastName).toUpperCase();

    // Resolved Mother Name
    const motherFirstName = (mother?.firstName || record.motherFirstName || record.mother_name?.split(' ')[0] || '').toUpperCase();
    const motherMiddleName = (mother?.middleName || record.motherMiddleName || '').toUpperCase();
    const motherLastName = (mother?.lastName || record.motherLastName || record.mother_name?.split(' ').slice(-1)[0] || '').toUpperCase();

    // Resolved Father Name
    const fatherFirstName = (father?.firstName || record.fatherFirstName || record.father_name?.split(' ')[0] || '').toUpperCase();
    const fatherMiddleName = (father?.middleName || record.fatherMiddleName || '').toUpperCase();
    const rawFatherLastName = father?.lastName || record.fatherLastName || record.father_name?.split(' ').slice(-1)[0] || '';
    const fatherExt = father?.extension || record.fatherExtension || '';
    const fatherLastName = (fatherExt ? `${rawFatherLastName} ${fatherExt}` : rawFatherLastName).toUpperCase();

    // Birth Date Breakdown
    const rawBirthDate = record.birth_date || record.birthDate || record.dateOfBirth;
    const birthDateObj = new Date(rawBirthDate);
    const birthDay = !isNaN(birthDateObj.getDate()) ? String(birthDateObj.getDate()) : '';
    const birthMonth = !isNaN(birthDateObj.getDate()) ? birthDateObj.toLocaleString('en-US', { month: 'long' }).toUpperCase() : '';
    const birthYear = !isNaN(birthDateObj.getFullYear()) ? String(birthDateObj.getFullYear()) : '';

    const x = 18;
    const width = 559;

    const drawBox = (y: number, h: number) => doc.rect(x, y, width, h).stroke();
    const drawLineH = (y: number) => doc.moveTo(x, y).lineTo(x + width, y).stroke();
    const drawLineV = (xPos: number, yStart: number, yEnd: number) => doc.moveTo(xPos, yStart).lineTo(xPos, yEnd).stroke();

    // Primary Container Border
    doc.lineWidth(1.8).rect(x, 18, width, 805).stroke();
    doc.lineWidth(0.8);

    // --- 1. HEADER ---
    doc.fontSize(6).font('Helvetica').text('municipal form no. 102\n(revised august 2016)', x + 8, 23);
    doc.text('(to be accomplished in quadruplicate using black ink)', x, 23, { width: width - 8, align: 'right' });

    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .text('REPUBLIC OF THE PHILIPPINES', x, 22, { width, align: 'center' })
      .text('OFFICE OF THE CIVIL REGISTRAR GENERAL', x, 31, { width, align: 'center' })
      .fontSize(11)
      .text('CERTIFICATE OF LIVE BIRTH', x, 43, { width, align: 'center' });

    // --- 2. LOCATION & REGISTRY ---
    let curY = 58;
    drawBox(curY, 30);
    drawLineV(x + 360, curY, curY + 30);

    const prov = (record.birthProvince || mother?.residence?.province || father?.residence?.province || 'CAGAYAN').toUpperCase();
    const cityMun = (record.birthCity || mother?.residence?.city || father?.residence?.city || 'STA ANA').toUpperCase();

    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('PROVINCE:', x + 5, curY + 5);
    doc.fontSize(9).text(prov, x + 120, curY + 4, { underline: true });

    doc.fontSize(7).text('CITY/MUNICIPALITY:', x + 5, curY + 17);
    doc.fontSize(9).text(cityMun, x + 120, curY + 16, { underline: true });

    doc.fontSize(7).text('REGISTRY NO.', x + 368, curY + 5);
    doc.fontSize(9).text((record.certificate_number || record.certificateNumber || '').toUpperCase(), x + 368, curY + 16);

    // Helper for horizontal lines that respect the vertical sidebar column
    const drawSectionLineH = (y: number, startX = cX) => doc.moveTo(startX, y).lineTo(x + width, y).stroke();

    // --- 3. SECTION 1: CHILD ---
    curY += 30;
    drawBox(curY, 120);
    drawLineV(x + 24, curY, curY + 120);

    // Centered vertical label without line collisions
    doc.fontSize(8).font('Helvetica-Bold');
    ['C', 'H', 'I', 'L', 'D'].forEach((char, i) => {
      doc.text(char, x, curY + 28 + i * 14, { width: 24, align: 'center' });
    });

    const cX = x + 24;
    const cW = width - 24;

    // Field 1: Name
    drawSectionLineH(curY + 28);
    doc.fontSize(6.5).font('Helvetica-Bold').text('1. NAME (FIRST, MIDDLE, LAST)', cX + 5, curY + 3);
    doc.fontSize(8.5).font('Helvetica-Bold');
    doc.text(childFirstName, cX + 10, curY + 14, { width: cW / 3 - 10, align: 'center' });
    doc.text(childMiddleName, cX + cW / 3, curY + 14, { width: cW / 3, align: 'center' });
    doc.text(childLastName, cX + (2 * cW) / 3, curY + 14, { width: cW / 3 - 10, align: 'center' });

    // Field 2 & 3: Sex & Date of Birth
    drawSectionLineH(curY + 53);
    drawLineV(cX + 220, curY + 28, curY + 53);

    doc.fontSize(6.5).font('Helvetica-Bold').text('2. SEX (MALE / FEMALE)', cX + 5, curY + 31);
    doc.fontSize(8.5).text((record.child_gender || record.childGender || 'FEMALE').toUpperCase(), cX + 5, curY + 41, { width: 210, align: 'center' });

    doc.fontSize(6.5).text('3. DATE OF BIRTH (DAY, MONTH, YEAR)', cX + 225, curY + 31);
    doc.fontSize(8.5);
    doc.text(birthDay, cX + 230, curY + 41, { width: 60, align: 'center' });
    doc.text(birthMonth, cX + 310, curY + 41, { width: 100, align: 'center' });
    doc.text(birthYear, cX + 430, curY + 41, { width: 80, align: 'center' });

    // Field 4: Place of Birth
    drawSectionLineH(curY + 85);
    doc.fontSize(6.5).font('Helvetica-Bold').text('4. PLACE OF BIRTH', cX + 5, curY + 56);

    const rawPlace = record.place_of_birth || record.placeOfBirth || '';
    const placeParts = rawPlace ? rawPlace.split(',').map((p: string) => p.trim()) : [];
    const facility = (placeParts[0] || 'ALFONSO PONCE ENRILE MEMORIAL DISTRICT HOSPITAL').toUpperCase();
    const pbCity = (placeParts[1] || 'GONZAGA').toUpperCase();
    const pbProvince = (placeParts.slice(2).join(', ') || 'CAGAYAN').toUpperCase();

    doc.fontSize(5.5).font('Helvetica').text('(NAME OF HOSPITAL/CLINIC/INSTITUTION/HOUSE NO., ST., BARANGAY)', cX + 110, curY + 56);
    doc.text('(CITY/MUNICIPALITY)', cX + 350, curY + 56);
    doc.text('(PROVINCE)', cX + 465, curY + 56);

    doc.fontSize(7.5).font('Helvetica-Bold');
    doc.text(facility, cX + 70, curY + 68, { width: 260, align: 'center' });
    doc.text(pbCity, cX + 335, curY + 68, { width: 100, align: 'center' });
    doc.text(pbProvince, cX + 440, curY + 68, { width: 90, align: 'center' });

    // Field 5a, 5b, 5c & 6: Type, Multiple Order, Birth Order, Weight
    drawLineV(cX + 125, curY + 85, curY + 120);
    drawLineV(cX + 300, curY + 85, curY + 120);
    drawLineV(cX + 415, curY + 85, curY + 120);

    doc.fontSize(5.5).font('Helvetica-Bold').text('5a. TYPE OF BIRTH', cX + 5, curY + 88);
    doc.fontSize(8).text((child?.typeOfBirth || record.typeOfBirth || 'SINGLE').toUpperCase(), cX + 5, curY + 103, { width: 115, align: 'center' });

    doc.fontSize(5.5).text('5b. IF MULTIPLE BIRTH CHILD WAS', cX + 130, curY + 88);
    doc.fontSize(8).text((child?.multipleBirthOrder || record.multipleBirthOrder || 'NOT APPLICABLE').toUpperCase(), cX + 130, curY + 103, { width: 165, align: 'center' });

    doc.fontSize(5.5).text('5c. BIRTH ORDER', cX + 305, curY + 88);
    doc.fontSize(8).text((child?.birthOrder || record.birthOrder || 'SIXTH').toUpperCase(), cX + 305, curY + 103, { width: 105, align: 'center' });

    doc.fontSize(5.5).text('6. WEIGHT AT BIRTH', cX + 420, curY + 88);
    const weightRaw = child?.birthWeightGrams || record.birthWeightGrams || '2915';
    doc.fontSize(8).text(`${weightRaw} G`, cX + 420, curY + 103, { width: 110, align: 'center' });

    // --- 4. SECTION 2: MOTHER ---
    curY += 120;
    drawBox(curY, 110);
    drawLineV(x + 24, curY, curY + 110);

    doc.fontSize(8).font('Helvetica-Bold');
    ['M', 'O', 'T', 'H', 'E', 'R'].forEach((char, i) => {
      doc.text(char, x, curY + 18 + i * 13, { width: 24, align: 'center' });
    });

    // Field 7: Maiden Name
    drawSectionLineH(curY + 26);
    doc.fontSize(6.5).font('Helvetica-Bold').text('7. MAIDEN NAME (FIRST, MIDDLE, LAST)', cX + 5, curY + 3);
    doc.fontSize(8.5);
    doc.text(motherFirstName, cX + 10, curY + 14, { width: cW / 3 - 10, align: 'center' });
    doc.text(motherMiddleName, cX + cW / 3, curY + 14, { width: cW / 3, align: 'center' });
    doc.text(motherLastName, cX + (2 * cW) / 3, curY + 14, { width: cW / 3 - 10, align: 'center' });

    // Field 8 & 9: Citizenship & Religion
    drawSectionLineH(curY + 52);
    drawLineV(cX + 260, curY + 26, curY + 52);

    doc.fontSize(6.5).font('Helvetica-Bold').text('8. CITIZENSHIP', cX + 5, curY + 29);
    doc.fontSize(8.5).text((mother?.citizenship || record.motherCitizenship || 'FILIPINO').toUpperCase(), cX + 5, curY + 39, { width: 250, align: 'center' });

    doc.fontSize(6.5).text('9. RELIGION', cX + 265, curY + 29);
    doc.fontSize(8.5).text((mother?.religion || record.motherReligion || 'ROMAN CATHOLIC').toUpperCase(), cX + 265, curY + 39, { width: cW - 270, align: 'center' });

    // Field 10a, 10b, 10c, 11, 12: Counts, Occupation, Age
    drawSectionLineH(curY + 78);
    drawLineV(cX + 78, curY + 52, curY + 78);
    drawLineV(cX + 156, curY + 52, curY + 78);
    drawLineV(cX + 234, curY + 52, curY + 78);
    drawLineV(cX + 395, curY + 52, curY + 78);

    doc.fontSize(5).font('Helvetica-Bold').text('10a. TOTAL NUMBER OF\nCHILDREN BORN ALIVE', cX + 2, curY + 54, { width: 74, align: 'center' });
    doc.fontSize(8.5).text(String(mother?.childrenBornAlive ?? record.motherChildrenBornAlive ?? '6'), cX + 2, curY + 66, { width: 74, align: 'center' });

    doc.fontSize(5).text('10b. CHILDREN LIVING\nINCLUDING THIS BIRTH', cX + 80, curY + 54, { width: 74, align: 'center' });
    doc.fontSize(8.5).text(String(mother?.childrenLiving ?? record.motherChildrenLiving ?? '6'), cX + 80, curY + 66, { width: 74, align: 'center' });

    doc.fontSize(5).text('10c. CHILDREN BORN\nALIVE BUT NOW DEAD', cX + 158, curY + 54, { width: 74, align: 'center' });
    doc.fontSize(8.5).text(String(mother?.childrenDead ?? record.motherChildrenDead ?? '0'), cX + 158, curY + 66, { width: 74, align: 'center' });

    doc.fontSize(6.5).text('11. OCCUPATION', cX + 239, curY + 55);
    doc.fontSize(8.5).text((mother?.occupation || record.motherOccupation || 'HOUSEKEEPING').toUpperCase(), cX + 239, curY + 66, { width: 150, align: 'center' });

    doc.fontSize(6.5).text('12. AGE AT TIME OF BIRTH', cX + 400, curY + 55);
    doc.fontSize(8.5).text(String(mother?.age || record.motherAge || '42'), cX + 400, curY + 66, { width: cW - 405, align: 'center' });

    // Field 13: Mother Residence
    const mRes = mother?.residence;
    doc.fontSize(6.5).font('Helvetica-Bold').text('13. RESIDENCE', cX + 5, curY + 81);
    doc.fontSize(5.5).font('Helvetica').text('(HOUSE NO., ST., BARANGAY)', cX + 110, curY + 81);
    doc.text('(CITY/MUNICIPALITY)', cX + 270, curY + 81);
    doc.text('(PROVINCE)', cX + 390, curY + 81);
    doc.text('(COUNTRY)', cX + 475, curY + 81);

    doc.fontSize(8.5).font('Helvetica-Bold');
    doc.text((mRes?.street || record.motherStreet || 'TANGATAN').toUpperCase(), cX + 80, curY + 93, { width: 160, align: 'center' });
    doc.text((mRes?.city || record.motherCity || 'STA ANA').toUpperCase(), cX + 250, curY + 93, { width: 110, align: 'center' });
    doc.text((mRes?.province || record.motherProvince || 'CAGAYAN').toUpperCase(), cX + 365, curY + 93, { width: 90, align: 'center' });
    doc.text((mRes?.country || record.motherCountry || 'PHILIPPINES').toUpperCase(), cX + 455, curY + 93, { width: 75, align: 'center' });

    // --- 5. SECTION 3: FATHER ---
    curY += 110;
    drawBox(curY, 82);
    drawLineV(x + 24, curY, curY + 82);

    doc.fontSize(8).font('Helvetica-Bold');
    ['F', 'A', 'T', 'H', 'E', 'R'].forEach((char, i) => {
      doc.text(char, x, curY + 5 + i * 12, { width: 24, align: 'center' });
    });

    // Field 14: Father Name
    drawSectionLineH(curY + 26);
    doc.fontSize(6.5).font('Helvetica-Bold').text('14. NAME (FIRST, MIDDLE, LAST)', cX + 5, curY + 3);
    doc.fontSize(8.5);
    doc.text(fatherFirstName, cX + 10, curY + 14, { width: cW / 3 - 10, align: 'center' });
    doc.text(fatherMiddleName, cX + cW / 3, curY + 14, { width: cW / 3, align: 'center' });
    doc.text(fatherLastName, cX + (2 * cW) / 3, curY + 14, { width: cW / 3 - 10, align: 'center' });

    // Field 15, 16, 17, 18: Citizenship, Religion, Occupation, Age
    drawSectionLineH(curY + 52);
    drawLineV(cX + 125, curY + 26, curY + 52);
    drawLineV(cX + 270, curY + 26, curY + 52);
    drawLineV(cX + 435, curY + 26, curY + 52);

    doc.fontSize(6.5).font('Helvetica-Bold').text('15. CITIZENSHIP', cX + 5, curY + 29);
    doc.fontSize(8.5).text((father?.citizenship || record.fatherCitizenship || 'FILIPINO').toUpperCase(), cX + 5, curY + 39, { width: 115, align: 'center' });

    doc.fontSize(6.5).text('16. RELIGION', cX + 130, curY + 29);
    doc.fontSize(8.5).text((father?.religion || record.fatherReligion || 'ROMAN CATHOLIC').toUpperCase(), cX + 130, curY + 39, { width: 135, align: 'center' });

    doc.fontSize(6.5).text('17. OCCUPATION', cX + 275, curY + 29);
    doc.fontSize(8.5).text((father?.occupation || record.fatherOccupation || 'FISHERMAN').toUpperCase(), cX + 275, curY + 39, { width: 155, align: 'center' });

    doc.fontSize(6.5).text('18. AGE', cX + 440, curY + 29);
    doc.fontSize(8.5).text(String(father?.age || record.fatherAge || '50'), cX + 440, curY + 39, { width: cW - 445, align: 'center' });

    // Field 19: Father Residence
    const fRes = father?.residence;
    doc.fontSize(6.5).font('Helvetica-Bold').text('19. RESIDENCE', cX + 5, curY + 55);
    doc.fontSize(5.5).font('Helvetica').text('(HOUSE NO., ST., BARANGAY)', cX + 110, curY + 55);
    doc.text('(CITY/MUNICIPALITY)', cX + 270, curY + 55);
    doc.text('(PROVINCE)', cX + 390, curY + 55);
    doc.text('(COUNTRY)', cX + 475, curY + 55);

    doc.fontSize(8.5).font('Helvetica-Bold');
    doc.text((fRes?.street || record.fatherStreet || 'TANGATAN').toUpperCase(), cX + 80, curY + 67, { width: 160, align: 'center' });
    doc.text((fRes?.city || record.fatherCity || 'STA ANA').toUpperCase(), cX + 250, curY + 67, { width: 110, align: 'center' });
    doc.text((fRes?.province || record.fatherProvince || 'CAGAYAN').toUpperCase(), cX + 365, curY + 67, { width: 90, align: 'center' });
    doc.text((fRes?.country || record.fatherCountry || 'PHILIPPINES').toUpperCase(), cX + 455, curY + 67, { width: 75, align: 'center' });

    // --- 6. SECTION 4: MARRIAGE OF PARENTS ---
    curY += 82;
    drawBox(curY, 34);

    doc.fontSize(6.5).font('Helvetica-Bold').text('20. MARRIAGE OF PARENTS', x + 5, curY + 3);

    const isNotMarried = marriage?.isMarried === false || record.parentsNotMarried;
    const mDate = (isNotMarried ? 'NOT MARRIED' : marriage?.date || record.marriageDate || 'N/A').toUpperCase();
    const mPlace = (isNotMarried ? 'N/A' : `${marriage?.city || record.marriageCity || ''}, ${marriage?.province || record.marriageProvince || ''}`).toUpperCase();

    doc.fontSize(6).font('Helvetica-Bold').text('20a. DATE:', x + 5, curY + 14);
    doc.fontSize(8.5).text(mDate, x + 5, curY + 22);

    doc.fontSize(6).text('20b. PLACE (CITY/MUNICIPALITY, PROVINCE, COUNTRY):', x + 280, curY + 14);
    doc.fontSize(8.5).text(mPlace, x + 280, curY + 22);

    // --- 7. SECTION 5: ATTENDANT ---
    curY += 34;
    drawBox(curY, 78);

    doc.fontSize(6.5).font('Helvetica-Bold').text('21a. ATTENDANT', x + 5, curY + 3);

    const types = ['1 PHYSICIAN', '2 NURSE', '3 MIDWIFE', '4 HILOT', '5 OTHERS'];
    const currentType = attendant?.type || record.attendant_position || record.attendantPosition || attendantMeta.titlePosition || '1 PHYSICIAN';

    let attX = x + 5;
    types.forEach((t) => {
      const isSelected = currentType.toUpperCase().includes(t.slice(2));
      doc.fontSize(7).font('Helvetica-Bold').text(`[ ${isSelected ? 'X' : ' '} ] ${t}`, attX, curY + 15);
      attX += 105;
    });

    drawLineH(curY + 26);

    doc.fontSize(6.5).font('Helvetica-Bold').text('21b. CERTIFICATION OF ATTENDANT AT BIRTH', x + 5, curY + 29);
    doc.fontSize(5.5).font('Helvetica-Oblique').text('(Physician, Nurse, Midwife, Traditional Birth Attendant/Hilot, Etc.)', x + 185, curY + 29);
    doc.fontSize(6.5).font('Helvetica-Oblique').text('I hereby certify that i attended the birth of the child who was born alive at the date and time of birth specified above.', x + 35, curY + 38);

    doc.fontSize(6).font('Helvetica').text('NAME IN PRINT:', x + 5, curY + 50);
    doc.fontSize(8.5).font('Helvetica-Bold').text((attendantName || 'DR. JACK CADAY').toUpperCase(), x + 75, curY + 48);
    doc.moveTo(x + 75, curY + 58).lineTo(x + 250, curY + 58).stroke();

    doc.fontSize(6).font('Helvetica').text('ADDRESS:', x + 270, curY + 50);
    const resolvedAttAddress = (record.attendant_address || attendant?.address || record.attendantAddress || attendantMeta.address || 'APEMDH, GONZAGA, CAGAYAN').toUpperCase();
    doc.fontSize(8.5).font('Helvetica-Bold').text(resolvedAttAddress, x + 320, curY + 48);
    doc.moveTo(x + 320, curY + 58).lineTo(x + 530, curY + 58).stroke();

    doc.fontSize(6).font('Helvetica').text('TITLE OR POSITION:', x + 5, curY + 64);
    const resolvedAttTitle = (record.attendant_position || attendant?.title || record.attendantPosition || attendantMeta.titlePosition || 'ATTENDING PHYSICIAN').toUpperCase();
    doc.fontSize(8.5).font('Helvetica-Bold').text(resolvedAttTitle, x + 75, curY + 62);
    doc.moveTo(x + 75, curY + 72).lineTo(x + 250, curY + 72).stroke();

    doc.fontSize(6).font('Helvetica').text('DATE:', x + 270, curY + 64);
    doc.fontSize(8.5).font('Helvetica-Bold').text('02 SEPTEMBER 2026', x + 320, curY + 62);
    doc.moveTo(x + 320, curY + 72).lineTo(x + 530, curY + 72).stroke();

    // --- 8. SECTION 6: INFORMANT & PREPARED BY ---
    curY += 78;
    drawBox(curY, 90);
    drawLineV(x + width / 2, curY, curY + 90);

    // Left Half: Informant
    doc.fontSize(6.5).font('Helvetica-Bold').text('22. CERTIFICATION OF INFORMANT', x + 5, curY + 3);
    doc.fontSize(5.5).font('Helvetica-Oblique').text('i hereby certify that all information supplied is true and correct.', x + 5, curY + 12);

    const infName = (informant?.name || record.informantName || 'EUGENIO QUUOTE CUABO').toUpperCase();
    const infRel = (informant?.relationship || record.informantRelationship || 'FATHER').toUpperCase();
    const infAddr = (informant?.address || record.informantAddress || 'TANGATAN, STA ANA , CAGAYAN, PHILIPPINES').toUpperCase();

    doc.fontSize(5.5).font('Helvetica').text('NAME IN PRINT:', x + 5, curY + 26);
    doc.fontSize(8.5).font('Helvetica-Bold').text(infName, x + 80, curY + 23);
    doc.moveTo(x + 75, curY + 32).lineTo(x + 265, curY + 32).stroke();

    doc.fontSize(5.5).font('Helvetica').text('RELATIONSHIP TO CHILD:', x + 5, curY + 41);
    doc.fontSize(8.5).font('Helvetica-Bold').text(infRel, x + 95, curY + 38);
    doc.moveTo(x + 90, curY + 47).lineTo(x + 265, curY + 47).stroke();

    doc.fontSize(5.5).font('Helvetica').text('ADDRESS:', x + 5, curY + 56);
    doc.fontSize(7.5).font('Helvetica-Bold').text(infAddr, x + 50, curY + 53, { width: 215 });
    doc.moveTo(x + 45, curY + 62).lineTo(x + 265, curY + 62).stroke();

    doc.fontSize(5.5).font('Helvetica').text('DATE:', x + 5, curY + 73);
    doc.fontSize(8.5).font('Helvetica-Bold').text('SEPTEMBER 02, 2026', x + 80, curY + 70);
    doc.moveTo(x + 75, curY + 79).lineTo(x + 265, curY + 79).stroke();

    // Right Half: Prepared By
    const rightX = x + width / 2 + 5;

    doc.fontSize(6.5).font('Helvetica-Bold').text('23. PREPARED BY', rightX, curY + 3);

    doc.fontSize(5.5).font('Helvetica').text('NAME IN PRINT:', rightX + 5, curY + 26);
    doc.fontSize(8.5).font('Helvetica-Bold').text((creatorName || 'DRA. MILDRED EVELYN M. PALPALLATOC, MHA').toUpperCase(), rightX + 75, curY + 23);
    doc.moveTo(rightX + 65, curY + 32).lineTo(x + width - 10, curY + 32).stroke();

    doc.fontSize(5.5).font('Helvetica').text('TITLE OR POSITION:', rightX + 5, curY + 41);
    doc.fontSize(8.5).font('Helvetica-Bold').text((creatorMeta.titlePosition || 'CHIEF OF HOSPITAL').toUpperCase(), rightX + 85, curY + 38);
    doc.moveTo(rightX + 75, curY + 47).lineTo(x + width - 10, curY + 47).stroke();

    doc.fontSize(5.5).font('Helvetica').text('DATE:', rightX + 5, curY + 73);
    doc.fontSize(8.5).font('Helvetica-Bold').text('SEPTEMBER 02, 2026', rightX + 75, curY + 70);
    doc.moveTo(rightX + 65, curY + 79).lineTo(x + width - 10, curY + 79).stroke();

    // --- 9. SECTION 7: RECEIVED & REGISTERED ---
    curY += 90;
    drawBox(curY, 80);
    drawLineV(x + width / 2, curY, curY + 80);

    // Left Half: 24. RECEIVED BY
    doc.fontSize(6.5).font('Helvetica-Bold').text('24. RECEIVED BY', x + 5, curY + 3);

    doc.fontSize(6).font('Helvetica').text('NAME:', x + 5, curY + 23);
    doc.fontSize(8.5).font('Helvetica-Bold').text((approvedBy || 'GUILLERMO R. IMPERIO').toUpperCase(), x + 60, curY + 20);
    doc.moveTo(x + 55, curY + 29).lineTo(x + 265, curY + 29).stroke();

    doc.fontSize(6).font('Helvetica').text('POSITION:', x + 5, curY + 37);
    doc.fontSize(8.5).font('Helvetica-Bold').text((approverMeta.titlePosition || 'REGISTRATION OFFICER II').toUpperCase(), x + 60, curY + 34);
    doc.moveTo(x + 55, curY + 43).lineTo(x + 265, curY + 43).stroke();

    doc.fontSize(6).font('Helvetica').text('DATE:', x + 5, curY + 52);
    doc.fontSize(8.5).font('Helvetica-Bold').text('SEPTEMBER 02, 2026', x + 60, curY + 49);
    doc.moveTo(x + 55, curY + 58).lineTo(x + 265, curY + 58).stroke();

    // Right Half: 25. REGISTERED AT CIVIL REGISTRAR
    doc.fontSize(6.5).font('Helvetica-Bold').text('25. REGISTERED AT CIVIL REGISTRAR', rightX, curY + 3);

    doc.fontSize(6).font('Helvetica').text('NAME:', rightX + 5, curY + 23);
    doc.fontSize(8.5).font('Helvetica-Bold').text((submittedBy || 'WALDEN S. VENTURA').toUpperCase(), rightX + 55, curY + 20);
    doc.moveTo(rightX + 50, curY + 29).lineTo(x + width - 10, curY + 29).stroke();

    doc.fontSize(6).font('Helvetica').text('POSITION:', rightX + 5, curY + 37);
    doc.fontSize(8.5).font('Helvetica-Bold').text((submitterMeta.titlePosition || 'MUNICIPAL GOVERNMENT DEPT. HEAD I').toUpperCase(), rightX + 55, curY + 34);
    doc.moveTo(rightX + 50, curY + 43).lineTo(x + width - 10, curY + 43).stroke();

    doc.fontSize(6).font('Helvetica').text('DATE:', rightX + 5, curY + 52);
    doc.fontSize(8.5).font('Helvetica-Bold').text('SEPTEMBER 02, 2026', rightX + 55, curY + 49);
    doc.moveTo(rightX + 50, curY + 58).lineTo(x + width - 10, curY + 58).stroke();

    // --- 10. REMARKS / ANNOTATIONS ---
    curY += 80;
    // drawBox(curY, 48);

    doc.fontSize(6).font('Helvetica').text('REMARKS/ANNOTATIONS', x + 5, curY + 4);
    doc.fontSize(8.5).font('Helvetica-Bold').text('FOR LCRO/OCRG USE ONLY', x + 35, curY + 18);

    doc.end();
  });
}

export async function generateDeathCertificatePDF(
  record: Record<string, any>
): Promise<Buffer> {
  console.log('PDF RECORD DATA:', JSON.stringify(record, null, 2));

  const creatorName = record.created_by || record.createdBy;
  const approvedBy = record.approved_by || record.approvedBy;
  const submittedBy = record.submitted_by || record.submittedBy;
  const healthOfficerName = record.verified_by || record.certified_by || record.details?.healthOfficer?.name;

  const [creatorMeta, approverMeta, submitterMeta, healthOfficerMeta] = await Promise.all([
    getUserMetadata(creatorName),
    getUserMetadata(approvedBy),
    getUserMetadata(submittedBy),
    getUserMetadata(healthOfficerName),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 18 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Dynamic data parsing from JSON payload
    const deceased = record.details?.deceased || {};
    const parents = record.details?.parents || {};
    const causes = record.details?.causesOfDeath || {};
    const external = record.details?.externalCauses || {};
    const informant = record.details?.informant || {};
    const placeOfD = record.details?.placeOfDeath || {};

    // 1. Deceased Name
    const firstName = (deceased.firstName || record.deceased_first_name || '').toUpperCase();
    const middleName = (deceased.middleName || record.deceased_middle_name || '').toUpperCase();
    const rawLastName = deceased.lastName || record.deceased_last_name || '';
    const ext = deceased.extension ? ` ${deceased.extension}` : '';
    const lastName = `${rawLastName}${ext}`.toUpperCase();

    // 2. Dates & Formatting
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.toUpperCase();
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    };

    const dateOfDeathFormatted = formatDate(record.date_of_death || deceased.dateOfDeath);
    const dateOfBirthFormatted = formatDate(deceased.dateOfBirth);
    const certifiedDateFormatted = formatDate(record.certified_at || record.created_at);

    // 3. Location & Address Strings
    const province = (placeOfD.province || record.province || 'CAGAYAN').toUpperCase();
    const cityMunicipality = (placeOfD.city || record.city || 'GONZAGA').toUpperCase();

    const residenceAddr = [
      deceased.residence?.barangay,
      deceased.residence?.city,
      deceased.residence?.province,
      deceased.residence?.country
    ].filter(Boolean).join(', ').toUpperCase();

    const placeOfDeathStr = typeof record.place_of_death === 'string' 
      ? record.place_of_death.toUpperCase() 
      : [placeOfD.hospital, placeOfD.barangay, placeOfD.city, placeOfD.province].filter(Boolean).join(', ').toUpperCase();

    // 4. Parents
    const fatherName = parents.father 
      ? `${parents.father.firstName || ''} ${parents.father.middleName || ''} ${parents.father.lastName || ''}`.trim().toUpperCase()
      : '';
    const motherName = parents.mother 
      ? `${parents.mother.firstName || ''} ${parents.mother.middleName || ''} ${parents.mother.lastName || ''}`.trim().toUpperCase()
      : '';

    // Layout Constants
    const x = 18;
    const width = 559;

    const drawLineH = (y: number, startX = x, endX = x + width) => doc.moveTo(startX, y).lineTo(endX, y).stroke();
    const drawLineV = (xPos: number, yStart: number, yEnd: number) => doc.moveTo(xPos, yStart).lineTo(xPos, yEnd).stroke();

    // Base Outer Border
    doc.lineWidth(1.8).rect(x, 18, width, 805).stroke();
    doc.lineWidth(0.8);

    // --- 1. HEADER ---
    doc.fontSize(6).font('Helvetica').text('municipal form no. 103\n(revised august 2016)', x + 8, 23);
    doc.text('(to be accomplished in quadruplicate using black ink)', x, 23, { width: width - 8, align: 'right' });

    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .text('REPUBLIC OF THE PHILIPPINES', x, 22, { width, align: 'center' })
      .text('OFFICE OF THE CIVIL REGISTRAR GENERAL', x, 31, { width, align: 'center' })
      .fontSize(11)
      .text('CERTIFICATE OF DEATH', x, 43, { width, align: 'center' });

    // --- 2. LOCATION & REGISTRY NO. ---
    let curY = 58;
    drawLineH(curY);
    drawLineH(curY + 30);
    drawLineV(x + 360, curY, curY + 30);

    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('PROVINCE:', x + 5, curY + 5);
    doc.fontSize(9).text(province, x + 120, curY + 4, { underline: true });

    doc.fontSize(7).text('CITY/MUNICIPALITY:', x + 5, curY + 17);
    doc.fontSize(9).text(cityMunicipality, x + 120, curY + 16, { underline: true });

    doc.fontSize(7).text('REGISTRY NO.', x + 368, curY + 5);
    doc.fontSize(9).text((record.certificate_number || '').toUpperCase(), x + 368, curY + 16);

    // --- 3. FIELD 1: DECEASED NAME & FIELD 2: SEX ---
    curY = 88;
    drawLineH(curY + 32);
    drawLineV(x + 420, curY, curY + 32);

    doc.fontSize(5.5).font('Helvetica-Bold').text('1. NAME (FIRST) (MIDDLE) (LAST)', x + 5, curY + 3);
    doc.fontSize(8.5).font('Helvetica-Bold');
    doc.text(firstName, x + 10, curY + 15, { width: 130, align: 'center' });
    doc.text(middleName, x + 140, curY + 15, { width: 130, align: 'center' });
    doc.text(lastName, x + 270, curY + 15, { width: 140, align: 'center' });

    doc.fontSize(5.5).font('Helvetica-Bold').text('2. SEX (MALE/FEMALE)', x + 425, curY + 3);
    doc.fontSize(8.5).text((deceased.sex || record.deceased_gender || '').toUpperCase(), x + 425, curY + 15, { width: 125, align: 'center' });

    // --- 4. FIELDS 3, 4, 5: DATE OF DEATH, DATE OF BIRTH, AGE ---
    curY = 120;
    drawLineH(curY + 32);
    drawLineV(x + 190, curY, curY + 32);
    drawLineV(x + 365, curY, curY + 32);

    doc.fontSize(5.5).font('Helvetica-Bold').text('3. DATE OF DEATH (DAY, MONTH, YEAR)', x + 5, curY + 3);
    doc.fontSize(8.5).text(dateOfDeathFormatted, x + 5, curY + 15, { width: 180, align: 'center' });

    doc.fontSize(5.5).text('4. DATE OF BIRTH (DAY) (MONTH) (YEAR)', x + 195, curY + 3);
    doc.fontSize(8.5).text(dateOfBirthFormatted, x + 195, curY + 15, { width: 165, align: 'center' });

    doc.fontSize(5.5).text('5. AGE AT TIME OF DEATH', x + 370, curY + 3);
    doc.fontSize(8.5).text(`${record.deceased_age || deceased.ageBreakdown?.years || ''} YRS`, x + 370, curY + 15, { width: 180, align: 'center' });

    // --- 5. FIELDS 6 & 7: PLACE OF DEATH & CIVIL STATUS ---
    curY = 152;
    drawLineH(curY + 32);
    drawLineV(x + 410, curY, curY + 32);

    doc.fontSize(5.5).font('Helvetica-Bold').text('6. PLACE OF DEATH (HOSPITAL/CLINIC/INSTITUTION/HOUSE NO., ST., BARANGAY, CITY/MUNICIPALITY, PROVINCE)', x + 5, curY + 3);
    doc.fontSize(8).text(placeOfDeathStr, x + 10, curY + 16, { width: 395, align: 'center' });

    doc.fontSize(5.5).text('7. CIVIL STATUS', x + 415, curY + 3);
    doc.fontSize(8.5).text((deceased.civilStatus || '').toUpperCase(), x + 415, curY + 15, { width: 135, align: 'center' });

    // --- 6. FIELDS 8, 9, 10: RELIGION, CITIZENSHIP, RESIDENCE ---
    curY = 184;
    drawLineH(curY + 32);
    drawLineV(x + 160, curY, curY + 32);
    drawLineV(x + 280, curY, curY + 32);

    doc.fontSize(5.5).font('Helvetica-Bold').text('8. RELIGION/RELIGIOUS SECT', x + 5, curY + 3);
    doc.fontSize(8).text((deceased.religion || '').toUpperCase(), x + 5, curY + 15, { width: 150, align: 'center' });

    doc.fontSize(5.5).text('9. CITIZENSHIP', x + 165, curY + 3);
    doc.fontSize(8).text((deceased.citizenship || '').toUpperCase(), x + 165, curY + 15, { width: 110, align: 'center' });

    doc.fontSize(5.5).text('10. RESIDENCE (HOUSE NO., ST., BARANGAY, CITY/MUNICIPALITY, PROVINCE)', x + 285, curY + 3);
    doc.fontSize(7.5).text(residenceAddr, x + 285, curY + 15, { width: 265, align: 'center' });

    // --- 7. FIELDS 11, 12, 13: OCCUPATION, FATHER, MOTHER ---
    curY = 216;
    drawLineH(curY + 34);
    drawLineV(x + 180, curY, curY + 34);
    drawLineV(x + 365, curY, curY + 34);

    doc.fontSize(5.5).font('Helvetica-Bold').text('11. OCCUPATION', x + 5, curY + 3);
    doc.fontSize(8).text((deceased.occupation || '').toUpperCase(), x + 5, curY + 15, { width: 170, align: 'center' });

    doc.fontSize(5.5).text('12. NAME OF FATHER (FIRST, MIDDLE, LAST)', x + 185, curY + 3);
    doc.fontSize(8).text(fatherName, x + 185, curY + 15, { width: 175, align: 'center' });

    doc.fontSize(5.5).text('13. MAIDEN NAME OF MOTHER (FIRST, MIDDLE, LAST)', x + 370, curY + 3);
    doc.fontSize(8).text(motherName, x + 370, curY + 15, { width: 180, align: 'center' });

    // --- 8. SECTION TITLE: MEDICAL CERTIFICATE ---
    curY = 250;
    drawLineH(curY + 22);
    doc.fontSize(9).font('Helvetica-Bold').text('MEDICAL CERTIFICATE', x, curY + 3, { width, align: 'center' });
    doc.fontSize(5.5).font('Helvetica').text('(FOR AGE 0 TO 7 DAYS, ACCOMPLISH ITEMS 14-19A AT THE BACK)', x, curY + 13, { width, align: 'center' });

    // --- 9. CAUSES OF DEATH & ICD-10 ---
    curY = 272;
    drawLineH(curY + 84);
    drawLineV(x + 365, curY, curY + 84);

    doc.fontSize(6).font('Helvetica-Bold').text('19B. CAUSES OF DEATH', x + 5, curY + 3);

    const immCause = (causes.immediateCause || record.cause_of_death || 'NONE').toUpperCase();
    const antCause = (causes.antecedentCause || 'NONE').toUpperCase();
    const undCause = (causes.underlyingCause || 'NONE').toUpperCase();
    const othCond = (causes.otherConditions || 'NONE').toUpperCase();

    // Immediate Cause
    doc.fontSize(6.5).font('Helvetica-Bold').text('I. IMMEDIATE CAUSE:', x + 5, curY + 16);
    doc.fontSize(8).text(immCause, x + 100, curY + 15);
    drawLineH(curY + 24, x + 95, x + 360);

    // Antecedent Cause
    doc.fontSize(6.5).text('ANTECEDENT CAUSE:', x + 12, curY + 33);
    doc.fontSize(8).text(antCause, x + 100, curY + 32);
    drawLineH(curY + 41, x + 95, x + 360);

    // Underlying Cause
    doc.fontSize(6.5).text('UNDERLYING CAUSE:', x + 12, curY + 50);
    doc.fontSize(8).text(undCause, x + 100, curY + 49);
    drawLineH(curY + 58, x + 95, x + 360);

    // Other Conditions
    doc.fontSize(6.5).text('II. OTHER CONDITIONS:', x + 5, curY + 67);
    doc.fontSize(8).text(othCond, x + 100, curY + 66);
    drawLineH(curY + 75, x + 95, x + 360);

    // ICD-10 Box
    doc.fontSize(5.5).font('Helvetica-Bold').text('WHO ICD-10 CODE', x + 370, curY + 12);
    doc.roundedRect(x + 372, curY + 22, 155, 26, 3).fillAndStroke('#FFF0F2', '#A38086');
    doc.fillColor('#A10820').fontSize(9).font('Helvetica-Bold').text((record.icd10_code || '').toUpperCase(), x + 372, curY + 31, { width: 155, align: 'center' });
    doc.fillColor('#000000'); // Reset color

    // --- 10. MATERNAL CONDITION ---
    curY = 356;
    drawLineH(curY + 50);
    doc.fontSize(6).font('Helvetica-Bold').text('19C. MATERNAL CONDITION (if the deceased is female aged 15-49 years old)', x + 5, curY + 3);
    doc.fontSize(6).font('Helvetica');
    doc.text('(_) A. PREGNANT, NOT IN LABOUR', x + 10, curY + 17);
    doc.text('(_) B. PREGNANT, IN LABOUR', x + 280, curY + 17);
    doc.text('(_) C. LESS THAN 42 DAYS AFTER DELIVERY', x + 10, curY + 29);
    doc.text('(_) D. 42 DAYS TO 1 YEAR AFTER DELIVERY', x + 280, curY + 29);
    doc.text('(_) E. NONE OF THE CHOICES', x + 10, curY + 40);

    // --- 11. EXTERNAL CAUSES & AUTOPSY ---
    curY = 406;
    drawLineH(curY + 62);
    drawLineV(x + 450, curY, curY + 62);

    doc.fontSize(6).font('Helvetica-Bold').text('19D. DEATH BY EXTERNAL CAUSES', x + 5, curY + 4);

    const manner = (external.mannerOfDeath || 'NOT APPLICABLE').toUpperCase();
    const placeExt = (external.placeOfOccurrence || 'NOT APPLICABLE').toUpperCase();

    doc.fontSize(7).font('Helvetica-Bold').text('A. MANNER OF DEATH (homicide, suicide, etc.)', x + 10, curY + 20);
    doc.fontSize(8).text(manner, x + 230, curY + 19, { width: 210, align: 'center' });
    drawLineH(curY + 27, x + 235, x + 440);

    doc.fontSize(7).text('B. PLACE OF OCCURRENCE OF EXTERNAL CAUSE', x + 10, curY + 38);
    doc.fontSize(8).text(placeExt, x + 230, curY + 37, { width: 210, align: 'center' });
    drawLineH(curY + 45, x + 235, x + 440);

    doc.fontSize(5.5).text('20. AUTOPSY', x + 455, curY + 4);
    doc.fontSize(8).text((record.details?.autopsy || 'NO').toUpperCase(), x + 455, curY + 26, { width: 95, align: 'center' });

    // --- 12. CERTIFICATION OF DEATH & REVIEWED BY ---
    curY = 468;
    drawLineH(curY + 115);

    // Left Side: Certification of Death
    doc.fontSize(6).font('Helvetica-Bold').text('22. CERTIFICATION OF DEATH', x + 5, curY + 3);
    doc.fontSize(5.5).font('Helvetica').text(
      'I hereby certify that the foregoing particulars are correct as near as same can be ascertained and i further certify that i have attended/have not attended the deceased and that death occurred on the date and time of death specified above.',
      x + 10,
      curY + 13,
      { width: 310 }
    );

    const certifierName = (record.certified_by || 'DR. JACK CADAY').toUpperCase();

    doc.fontSize(6).font('Helvetica').text('Name In Print', x + 10, curY + 38);
    doc.fontSize(8).font('Helvetica-Bold').text(certifierName, x + 70, curY + 36, { width: 240, align: 'center' });
    drawLineH(curY + 45, x + 65, x + 315);

    doc.fontSize(6).font('Helvetica').text('Title Or Position', x + 10, curY + 53);
    doc.fontSize(8).font('Helvetica-Bold').text('MEDICAL OFFICER III', x + 70, curY + 51, { width: 240, align: 'center' });
    drawLineH(curY + 60, x + 65, x + 315);

    doc.fontSize(6).font('Helvetica').text('Address', x + 10, curY + 68);
    doc.fontSize(8).text('SMART, GONZAGA, CAGAYAN', x + 70, curY + 66, { width: 240, align: 'center' });
    drawLineH(curY + 75, x + 65, x + 315);

    doc.fontSize(6).font('Helvetica').text('Date', x + 10, curY + 83);
    doc.fontSize(8).text(certifiedDateFormatted, x + 70, curY + 81, { width: 240, align: 'center' });
    drawLineH(curY + 90, x + 65, x + 315);

    // Right Side Box: REVIEWED BY
    doc.rect(x + 325, curY + 12, 225, 92).stroke();
    doc.fontSize(6).font('Helvetica-Bold').text('REVIEWED BY:', x + 330, curY + 16);

    const reviewerName = (record.verified_by || healthOfficerName || '').toUpperCase();
    doc.fontSize(8).font('Helvetica-Bold').text(reviewerName, x + 330, curY + 35, { width: 215, align: 'center' });
    drawLineH(curY + 48, x + 350, x + 525);
    doc.fontSize(4.5).font('Helvetica').text('SIGNATURE OVER PRINTED NAME OF HEALTH OFFICER', x + 330, curY + 51, { width: 215, align: 'center' });

    doc.fontSize(7).font('Helvetica-Bold').text(certifiedDateFormatted, x + 330, curY + 62, { width: 215, align: 'center' });
    drawLineH(curY + 71, x + 350, x + 525);
    doc.fontSize(4.5).font('Helvetica').text('DATE', x + 330, curY + 73, { width: 215, align: 'center' });

    // --- 13. BOTTOM QUADRANT: INFORMANT, PREPARED, RECEIVED, REGISTERED ---
    curY = 583;
    const boxW = width / 2; // 279.5
    const boxH = 100;

    // Grid Lines for Bottom Quadrant
    drawLineH(curY + boxH);
    drawLineH(curY + boxH * 2);
    drawLineV(x + boxW, curY, curY + boxH * 2);

    // Helper function to render a signature block
    const renderSignBlock = (
      title: string,
      name: string,
      role: string,
      addr: string,
      date: string,
      originX: number,
      originY: number
    ) => {
      doc.fontSize(6).font('Helvetica-Bold').text(title, originX + 5, originY + 5);

      doc.fontSize(6).font('Helvetica').text('Name:', originX + 5, originY + 22);
      doc.fontSize(8).font('Helvetica-Bold').text(name.toUpperCase(), originX + 45, originY + 20, { width: 220, align: 'center' });
      drawLineH(originY + 29, originX + 45, originX + 270);

      doc.fontSize(6).font('Helvetica').text(title.includes('INFORMANT') ? 'Relationship:' : 'Title Or Position', originX + 5, originY + 40);
      doc.fontSize(8).font('Helvetica-Bold').text(role.toUpperCase(), originX + 45, originY + 38, { width: 220, align: 'center' });
      drawLineH(originY + 47, originX + 45, originX + 270);

      doc.fontSize(6).font('Helvetica').text('Address:', originX + 5, originY + 58);
      doc.fontSize(7.5).font('Helvetica-Bold').text(addr.toUpperCase(), originX + 45, originY + 56, { width: 220, align: 'center' });
      drawLineH(originY + 65, originX + 45, originX + 270);

      doc.fontSize(6).font('Helvetica').text('Date:', originX + 5, originY + 76);
      doc.fontSize(8).font('Helvetica-Bold').text(date.toUpperCase(), originX + 45, originY + 74, { width: 220, align: 'center' });
      drawLineH(originY + 83, originX + 45, originX + 270);
    };

    // 26. CERTIFICATION OF INFORMANT
    const infAddr = [informant.address?.barangay, informant.address?.city, informant.address?.province].filter(Boolean).join(', ');
    renderSignBlock(
      '26. CERTIFICATION OF INFORMANT',
      informant.name || '',
      informant.relationship || '',
      infAddr,
      certifiedDateFormatted,
      x,
      curY
    );

    // 27. PREPARED BY
    renderSignBlock(
      '27. PREPARED BY',
      creatorName || '',
      creatorMeta.titlePosition || 'ADMINISTRATIVE OFFICER',
      creatorMeta.address || 'FLOURISHING, GONZAGA, CAGAYAN',
      certifiedDateFormatted,
      x + boxW,
      curY
    );

    // 28. RECEIVED BY
    renderSignBlock(
      '28. RECEIVED BY',
      approvedBy || '',
      approverMeta.titlePosition || 'REGISTRATION OFFICER II',
      approverMeta.address || 'PARADISE, GONZAGA, CAGAYAN',
      certifiedDateFormatted,
      x,
      curY + boxH
    );

    // 29. REGISTERED AT THE OFFICE OF THE CIVIL REGISTRAR
    renderSignBlock(
      '29. REGISTERED AT THE OFFICE OF THE CIVIL REGISTRAR',
      submittedBy || '',
      submitterMeta.titlePosition || 'MUNICIPAL GOVERNMENT DEPT. HEAD I',
      submitterMeta.address || 'CALAYAN, GONZAGA, CAGAYAN',
      certifiedDateFormatted,
      x + boxW,
      curY + boxH
    );

    doc.end();
  });
}