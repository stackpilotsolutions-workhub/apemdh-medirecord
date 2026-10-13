"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getBirthRecordsAction,
  submitToPhysicianAction,
  certifyBirthRecordAction,
  verifyBirthRecordAction,
  approveBirthRecordAction,
  finalizeLCRBirthAction,
  uploadBirthFileAction,
  getCreatorTitlePositionAction,
} from "@/app/actions/birth";
import { User, BirthRecord } from "@/lib/types";
import {
  ShieldCheck,
  Download,
  X,
  FileCheck,
  Baby,
  Archive,
  UploadCloud,
  Loader2,
  ArrowLeft,
  Eye,
  Printer,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function BirthRecordDetailsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const recordId = searchParams.get("id");

  const [record, setRecord] = useState<BirthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
  } | null>(null);

  const [creatorTitlePosition, setCreatorTitlePosition] = useState<string>("");
  const [submitterTitlePosition, setSubmitterTitlePosition] =
    useState<string>("");
  const [approverTitlePosition, setApproverTitlePosition] =
    useState<string>("");

  // Fetch Creator Title/Position
  useEffect(() => {
    if (!record?.createdBy) return;

    getCreatorTitlePositionAction(record.createdBy).then((title) => {
      setCreatorTitlePosition(title);
    });
  }, [record?.createdBy]);

  // Fetch Submitter Title/Position
  useEffect(() => {
    if (!record?.submittedBy) return;

    getCreatorTitlePositionAction(record.submittedBy).then((title) => {
      setSubmitterTitlePosition(title);
    });
  }, [record?.createdBy]);

  // Fetch Approver Title/Position
  useEffect(() => {
    if (!record?.approvedBy) return;

    getCreatorTitlePositionAction(record.approvedBy).then((title) => {
      setApproverTitlePosition(title);
    });
  }, [record?.createdBy]);

  const fetchRecord = async () => {
    if (!recordId) return;
    try {
      setLoading(true);
      const res = await getBirthRecordsAction("", "ALL");
      const found = res.find((r) => r.id === recordId);
      if (found) {
        setRecord(found);
      } else {
        toast.error("Birth record not found.");
      }
    } catch {
      toast.error("Failed to retrieve birth record details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchRecord();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const handleAction = async (
    actionFn: (id: string) => Promise<BirthRecord>,
    successMsg: string,
  ) => {
    if (!record) return;
    try {
      setActionLoading(true);
      const updated = await actionFn(record.id);
      setRecord(updated);
      toast.success(successMsg);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Workflow transition failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !record) return;

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", file);

      await uploadBirthFileAction(record.id, formData);
      toast.success("Supporting document uploaded.");
      fetchRecord();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "File upload failed.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleVerifyComplete = async () => {
    if (!record) return;
    try {
      setActionLoading(true);
      const updated = await verifyBirthRecordAction(
        record.id,
        record.supportingDocuments || [],
      );
      setRecord(updated);
      toast.success("Verification completed and submitted to CRO.");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Verification failed.");
    } finally {
      // corrected typo from fiudinally to finally
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-teal-700 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">
          Querying civil registry record...
        </span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <Baby className="h-12 w-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Record Not Found</h2>
        <p className="text-xs text-slate-500">
          No birth certificate record matches the requested ID or parameter.
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="h-4 w-4" /> Go back to Registry
        </button>
      </div>
    );
  }

  // Extract nested properties with flat field fallbacks
  const child = record.details?.child;
  const mother = record.details?.mother;
  const father = record.details?.father;
  const marriage = record.details?.marriage;
  const attendant = record.details?.attendant;
  const informant = record.details?.informant;

  // Resolved Child Name Fields
  const childFirstName =
    child?.firstName ||
    record.childFirstName ||
    record.childName?.split(" ")[0] ||
    "";
  const childMiddleName = child?.middleName || record.childMiddleName || "—";
  const childLastName =
    child?.lastName ||
    record.childLastName ||
    record.childName?.split(" ").slice(1).join(" ") ||
    "";
  const childExt = child?.extension || record.childExtension || "";

  // Resolved Mother Name Fields
  const motherFirstName =
    mother?.firstName ||
    record.motherFirstName ||
    record.motherName?.split(" ")[0] ||
    "";
  const motherMiddleName = mother?.middleName || record.motherMiddleName || "—";
  const motherLastName =
    mother?.lastName ||
    record.motherLastName ||
    record.motherName?.split(" ").slice(1).join(" ") ||
    "";

  // Resolved Father Name Fields
  const fatherFirstName =
    father?.firstName ||
    record.fatherFirstName ||
    record.fatherName?.split(" ")[0] ||
    "";
  const fatherMiddleName = father?.middleName || record.fatherMiddleName || "—";
  const fatherLastName =
    father?.lastName ||
    record.fatherLastName ||
    record.fatherName?.split(" ").slice(1).join(" ") ||
    "";
  const fatherExt = father?.extension || record.fatherExtension || "";

  // Parse Birth Date
  const birthDateObj = new Date(record.birthDate);
  const birthDay = !isNaN(birthDateObj.getDate())
    ? birthDateObj.getDate()
    : "N/A";
  const birthMonth = !isNaN(birthDateObj.getDate())
    ? birthDateObj.toLocaleString("default", { month: "long" })
    : "N/A";
  const birthYear = !isNaN(birthDateObj.getFullYear())
    ? birthDateObj.getFullYear()
    : "N/A";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Registry List
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <Printer className="h-4 w-4" /> Print Form
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-100 rounded-full">
            Status: {record.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Official Form Template */}
      <div className="mb-1 printable-form bg-white border-2 border-slate-900 font-serif text-slate-900 p-6 shadow-md text-xs leading-tight uppercase">
        {/* Document Header */}
        <div className="text-center space-y-0.5 border-b-2 border-slate-900 pb-2 relative">
          <span className="absolute left-0 top-0 text-[10px] lowercase font-sans">
            Municipal Form No. 102
            <br />
            (Revised August 2016)
          </span>
          <span className="absolute right-0 top-0 text-[10px] lowercase font-sans">
            (To be accomplished in quadruplicate using black ink)
          </span>
          <p className="text-[11px] tracking-wide pt-4 sm:pt-0">
            Republic of the Philippines
          </p>
          <p className="text-[11px] font-bold">
            OFFICE OF THE CIVIL REGISTRAR GENERAL
          </p>
          <h1 className="text-xl font-extrabold tracking-wider py-1">
            CERTIFICATE OF LIVE BIRTH
          </h1>
        </div>

        {/* Location & Registry No */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900 text-xs font-sans">
          <div className="col-span-8 border-r-2 border-slate-900 p-1.5 space-y-1">
            <div className="flex items-baseline">
              <span className="w-50 font-serif font-bold">Province:</span>
              <span className="font-bold text-sm underline tracking-widest">
                {record.birthProvince ||
                  mother?.residence?.province ||
                  father?.residence?.province ||
                  "CAGAYAN"}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-50 font-serif font-bold">
                City/Municipality:
              </span>
              <span className="font-bold text-sm underline tracking-widest">
                {record.birthCity ||
                  mother?.residence?.city ||
                  father?.residence?.city ||
                  "GONZAGA"}
              </span>
            </div>
          </div>
          <div className="col-span-4 p-1.5 font-serif">
            <span className="block font-bold">Registry No.</span>
            <span className="font-sans font-bold text-sm tracking-wider block mt-1">
              {record.certificateNumber}
            </span>
          </div>
        </div>

        {/* SECTION 1: CHILD */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900">
          <div className="col-span-1 border-r-2 border-slate-900 font-serif font-bold flex items-center justify-center text-center p-1 tracking-widest text-sm">
            C<br />H<br />I<br />L<br />D
          </div>
          <div className="col-span-11 grid grid-cols-12">
            {/* 1. Name */}
            <div className="col-span-12 border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                1. NAME (First, Middle, Last)
              </span>
              <div className="grid grid-cols-3 text-center font-sans font-bold text-sm py-1">
                <span>{childFirstName}</span>
                <span>{childMiddleName}</span>
                <span>
                  {childExt ? `${childLastName} ${childExt}` : childLastName}
                </span>
              </div>
            </div>

            {/* 2. Sex & 3. Date of Birth */}
            <div className="col-span-5 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                2. SEX (Male / Female)
              </span>
              <span className="font-sans font-bold text-center block py-1 text-sm">
                {record.childGender}
              </span>
            </div>
            <div className="col-span-7 border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                3. DATE OF BIRTH (Day, Month, Year)
              </span>
              <div className="grid grid-cols-3 text-center font-sans font-bold text-sm py-1">
                <span>{birthDay}</span>
                <span>{birthMonth}</span>
                <span>{birthYear}</span>
              </div>
            </div>

            {/* 4. Place of Birth - Exact Form Matching Layout */}
            {(() => {
              const parts = record.placeOfBirth
                ? record.placeOfBirth.split(",").map((p) => p.trim())
                : [];
              const facility = parts[0] || "—";
              const city = parts[1] || "—";
              const province = parts.slice(2).join(", ") || "—";

              return (
                <div className="col-span-12 border-b border-slate-900 grid grid-cols-12 text-[9px] font-sans p-2">
                  {/* Left Label Header Column */}
                  <div className="col-span-2 p-1 font-serif font-bold text-slate-800 leading-tight border-slate-900 flex items-center">
                    4. PLACE OF BIRTH
                  </div>

                  {/* Sub-fields Container */}
                  <div className="col-span-10 grid grid-cols-12">
                    {/* Name of Hospital / Clinic / Institution / House No. */}
                    <div className="col-span-7 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight">
                        (Name of Hospital/Clinic/Institution/House No., St.,
                        Barangay)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {facility}
                      </span>
                    </div>

                    {/* City / Municipality */}
                    <div className="col-span-3 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-center block">
                        (City/Municipality)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {city}
                      </span>
                    </div>

                    {/* Province */}
                    <div className="col-span-2 p-1 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-right block pr-1">
                        (Province)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {province}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 5a, 5b, 5c Type of Birth & 6. Weight */}
            <div className="col-span-3 border-r border-slate-900 p-1">
              <span className="font-serif font-bold block text-[9px]">
                5a. TYPE OF BIRTH
              </span>
              <span className="font-sans font-bold block text-center text-sm py-1">
                {child?.typeOfBirth || record.typeOfBirth || "SINGLE"}
              </span>
            </div>
            <div className="col-span-4 border-r border-slate-900 p-1">
              <span className="font-serif font-bold block text-[9px]">
                5b. IF MULTIPLE BIRTH CHILD WAS
              </span>
              <span className="font-sans font-bold block text-center text-sm py-1">
                {child?.multipleBirthOrder ||
                  record.multipleBirthOrder ||
                  "Not Applicable"}
              </span>
            </div>
            <div className="col-span-3 border-r border-slate-900 p-1">
              <span className="font-serif font-bold block text-[9px]">
                5c. BIRTH ORDER
              </span>
              <span className="font-sans font-bold block text-center text-sm py-1">
                {child?.birthOrder || record.birthOrder || "N/A"}
              </span>
            </div>
            <div className="col-span-2 p-1">
              <span className="font-serif font-bold block text-[9px]">
                6. WEIGHT AT BIRTH
              </span>
              <span className="font-sans font-bold block text-center text-sm py-1">
                {child?.birthWeightGrams || record.birthWeightGrams
                  ? `${child?.birthWeightGrams || record.birthWeightGrams} g`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: MOTHER */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900">
          <div className="col-span-1 border-r-2 border-slate-900 font-serif font-bold flex items-center justify-center text-center p-1 tracking-widest text-sm">
            M<br />O<br />T<br />H<br />E<br />R
          </div>
          <div className="col-span-11 grid grid-cols-12">
            {/* 7. Maiden Name */}
            <div className="col-span-12 border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                7. MAIDEN NAME (First, Middle, Last)
              </span>
              <div className="grid grid-cols-3 text-center font-sans font-bold text-sm py-1">
                <span>{motherFirstName}</span>
                <span>{motherMiddleName}</span>
                <span>{motherLastName}</span>
              </div>
            </div>

            {/* 8. Citizenship & 9. Religion */}
            <div className="col-span-6 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                8. CITIZENSHIP
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {mother?.citizenship || record.motherCitizenship || "FILIPINO"}
              </span>
            </div>
            <div className="col-span-6 border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                9. RELIGION
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {mother?.religion || record.motherReligion || "ROMAN CATHOLIC"}
              </span>
            </div>

            {/* 10a, 10b, 10c Birth Counts & 12. Age */}
            <div className="col-span-2 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[8px]">
                10a. Total number of Children born alive
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {mother?.childrenBornAlive ??
                  record.motherChildrenBornAlive ??
                  "N/A"}
              </span>
            </div>
            <div className="col-span-2 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[8px]">
                10b. Children living including this birth
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {mother?.childrenLiving ?? record.motherChildrenLiving ?? "N/A"}
              </span>
            </div>
            <div className="col-span-2 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[8px]">
                10c. Children born alive but now dead
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {mother?.childrenDead ?? record.motherChildrenDead ?? "0"}
              </span>
            </div>
            <div className="col-span-3 border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                11. OCCUPATION
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {mother?.occupation || record.motherOccupation || "N/A"}
              </span>
            </div>
            <div className="col-span-3 border-l border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                12. AGE at time of birth
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {mother?.age || record.motherAge || "N/A"}
              </span>
            </div>

            {/* 13. Residence - Custom Object Structure */}
            {(() => {
              const res = mother?.residence;

              // Map street directly to the first field since barangay is omitted
              const street = res?.street || record.motherStreet || "—";
              const city = res?.city || record.motherCity || "—";
              const province = res?.province || record.motherProvince || "—";
              const country =
                res?.country || record.motherCountry || "PHILIPPINES";

              return (
                <div className="col-span-12 p-2 border-b border-slate-900 grid grid-cols-12 text-[9px] font-sans">
                  {/* Left Label Column */}
                  <div className="col-span-2 p-1 font-serif font-bold text-slate-800 leading-tight border-slate-900 flex items-center">
                    13. RESIDENCE
                  </div>

                  {/* Sub-fields Container */}
                  <div className="col-span-10 grid grid-cols-12">
                    {/* House No., St., Barangay */}
                    <div className="col-span-4 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight">
                        (House No., St., Barangay)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {street}
                      </span>
                    </div>

                    {/* City/Municipality */}
                    <div className="col-span-3 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-center block">
                        (City/Municipality)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {city}
                      </span>
                    </div>

                    {/* Province */}
                    <div className="col-span-3 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-center block">
                        (Province)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {province}
                      </span>
                    </div>

                    {/* Country */}
                    <div className="col-span-2 p-1 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-center block">
                        (Country)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {country}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SECTION 3: FATHER */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900">
          <div className="col-span-1 border-r-2 border-slate-900 font-serif font-bold flex items-center justify-center text-center p-1 tracking-widest text-sm">
            F<br />A<br />T<br />H<br />E<br />R
          </div>
          <div className="col-span-11 grid grid-cols-12">
            {/* 14. Name */}
            <div className="col-span-12 border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[10px]">
                14. NAME (First, Middle, Last)
              </span>
              <div className="grid grid-cols-3 text-center font-sans font-bold text-sm py-1">
                <span>{fatherFirstName}</span>
                <span>{fatherMiddleName}</span>
                <span>
                  {fatherExt
                    ? `${fatherLastName} ${fatherExt}`
                    : fatherLastName}
                </span>
              </div>
            </div>

            {/* 15. Citizenship, 16. Religion, 17. Occupation, 18. Age */}
            <div className="col-span-3 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[9px]">
                15. CITIZENSHIP
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {father?.citizenship || record.fatherCitizenship || "FILIPINO"}
              </span>
            </div>
            <div className="col-span-3 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[9px]">
                16. RELIGION
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {father?.religion || record.fatherReligion || "ROMAN CATHOLIC"}
              </span>
            </div>
            <div className="col-span-4 border-r border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[9px]">
                17. OCCUPATION
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {father?.occupation || record.fatherOccupation || "N/A"}
              </span>
            </div>
            <div className="col-span-2 border-b border-slate-900 p-1">
              <span className="font-serif font-bold block text-[9px]">
                18. AGE
              </span>
              <span className="font-sans font-bold block text-center text-sm py-0.5">
                {father?.age || record.fatherAge || "N/A"}
              </span>
            </div>

            {/* 19. Father's Residence */}
            {(() => {
              const res = father?.residence;

              const street = res?.street || record.fatherStreet || "—";
              const city = res?.city || record.fatherCity || "—";
              const province = res?.province || record.fatherProvince || "—";
              const country =
                res?.country || record.fatherCountry || "PHILIPPINES";

              return (
                <div className="col-span-12 border-b p-2 border-slate-900 grid grid-cols-12 text-[9px] font-sans">
                  {/* Left Label Column */}
                  <div className="col-span-2 p-1 font-serif font-bold text-slate-800 leading-tight border-slate-900 flex items-center">
                    19. RESIDENCE
                  </div>

                  {/* Sub-fields Container */}
                  <div className="col-span-10 grid grid-cols-12">
                    {/* House No., St., Barangay */}
                    <div className="col-span-4 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight">
                        (House No., St., Barangay)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {street}
                      </span>
                    </div>

                    {/* City/Municipality */}
                    <div className="col-span-3 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-center block">
                        (City/Municipality)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {city}
                      </span>
                    </div>

                    {/* Province */}
                    <div className="col-span-3 p-1 border-slate-900 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-center block">
                        (Province)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {province}
                      </span>
                    </div>

                    {/* Country */}
                    <div className="col-span-2 p-1 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-600 font-serif leading-tight text-center block">
                        (Country)
                      </span>
                      <span className="font-bold text-xs text-center py-0.5">
                        {country}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SECTION 4: MARRIAGE OF PARENTS */}
        <div className="border-b-2 border-slate-900 p-1.5 font-serif">
          <span className="font-bold text-[10px] block">
            20. MARRIAGE OF PARENTS
          </span>
          <div className="grid grid-cols-2 gap-4 font-sans font-bold text-xs py-1">
            <div>
              <span className="font-serif font-normal text-[10px] block">
                20a. DATE:
              </span>
              <span className="text-sm">
                {marriage?.isMarried === false || record.parentsNotMarried
                  ? "NOT MARRIED"
                  : marriage?.date || record.marriageDate || "N/A"}
              </span>
            </div>
            <div>
              <span className="font-serif font-normal text-[10px] block">
                20b. PLACE (City/Municipality, Province, Country):
              </span>
              <span className="text-sm">
                {marriage?.isMarried === false || record.parentsNotMarried
                  ? "N/A"
                  : marriage?.city
                    ? `${marriage.city}, ${marriage.province || ""}, ${marriage.country || ""}`
                    : record.marriageCity
                      ? `${record.marriageCity}, ${record.marriageProvince || ""}, ${record.marriageCountry || ""}`
                      : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: ATTENDANT */}
        <div className="border-b-2 border-slate-900 p-1.5 font-serif space-y-1">
          <span className="font-bold text-[10px] block">21a. ATTENDANT</span>
          <div className="flex items-center gap-6 font-sans text-xs font-bold py-0.5">
            {["Physician", "Nurse", "Midwife", "Hilot", "Others"].map(
              (type, idx) => {
                const currentType = record.attendantPosition || "Others";
                const isSelected =
                  currentType.toLowerCase() === type.toLowerCase();
                return (
                  <span key={type} className={isSelected ? "underline" : ""}>
                    [ {isSelected ? "X" : " "} ] {idx + 1} {type}
                  </span>
                );
              },
            )}
          </div>

          <div className="pt-2 pb-2 border-t-2 border-slate-900 relative">
            <span className="font-bold text-[12px] block">
              21b. CERTIFICATION OF ATTENDANT AT BIRTH{" "}
              <span className="font-normal capitalize">
                (Physician, Nurse, Midwife, Traditional Birth Attendant/Hilot,
                etc.)
              </span>
            </span>
            <p className="text-[12px] font-normal lowercase italic p-1  mx-10">
              <span className="uppercase">I</span> hereby certify that I
              attended the birth of the child who was born alive at the date and
              time of birth specified above.
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-sans text-xs pt-2">
              {/* Row 1: Left */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[10px] shrink-0 pb-0.5">
                  Name in Print:
                </span>
                <span className="font-bold text-sm border-b border-slate-900 grow px-1 mx-8">
                  {record.attendantName || ""}
                </span>
              </div>

              {/* Row 1: Right */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[10px] shrink-0 pb-0.5">
                  Address:
                </span>
                <span className="font-bold text-sm border-b border-slate-900 grow px-1 mx-2">
                  {record.attendantAddress || ""}
                </span>
              </div>

              {/* Row 2: Left */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[10px] shrink-0 pb-0.5">
                  Title or Position:
                </span>
                <span className="font-bold text-sm border-b border-slate-900 grow px-1 mx-3">
                  {record.attendantPosition || ""}
                </span>
              </div>

              {/* Row 2: Right */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[10px] shrink-0 pb-0.5">
                  Date:
                </span>
                <span className="font-bold text-sm border-b border-slate-900 grow px-1 mx-7">
                  {record.certifiedAt
                    ? new Date(record.certifiedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: INFORMANT & PREPARED BY */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900 font-serif">
          <div className="border-r-2 border-slate-900 p-1.5 space-y-1 pb-3">
            <span className="font-bold text-[12px] block">
              22. CERTIFICATION OF INFORMANT
            </span>
            <p className="text-[9px] font-normal lowercase italic">
              I hereby certify that all information supplied is true and
              correct.
            </p>
            <div className="font-sans text-xs space-y-2 pt-1">
              {/* Name in Print */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[9px] shrink-0 pb-0.5">
                  Name in Print:
                </span>
                <span className="font-bold text-sm text-center border-b border-slate-900 grow px-1">
                  {informant?.name || record.informantName || record.motherName}
                </span>
              </div>

              {/* Relationship to Child */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[9px] shrink-0 pb-0.5">
                  Relationship to Child:
                </span>
                <span className="font-bold text-sm border-b border-slate-900 grow px-1">
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  {informant?.relationship ||
                    record.informantRelationship ||
                    ""}
                </span>
              </div>

              {/* Address */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[9px] shrink-0 pb-0.5">
                  Address:
                </span>
                <span className="font-bold text-sm text-center border-b border-slate-900 grow px-1">
                  {informant?.address ||
                    record.informantAddress ||
                    record.motherAddress ||
                    "GONZAGA, CAGAYAN"}
                </span>
              </div>

              {/* Date */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[9px] shrink-0 pb-0.5">
                  Date:
                </span>
                <span className="font-bold text-sm text-center border-b border-slate-900 grow px-1">
                  {(() => {
                    const rawDate =
                      informant?.date ||
                      record.informantDate ||
                      record.createdAt;
                    return rawDate
                      ? new Date(rawDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "2-digit",
                          year: "numeric",
                        })
                      : "—";
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-1.5 space-y-1">
            <span className="font-bold text-[12px] block">23. PREPARED BY</span>
            <div className="font-sans text-xs space-y-2 pt-4">
              {/* Name in Print */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[9px] shrink-0 pb-0.5">
                  Name in Print:
                </span>
                <span className="font-bold text-sm text-center border-b border-slate-900 grow px-1">
                  {record.createdBy || ""}
                </span>
              </div>

              {/* Title or Position */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[9px] shrink-0 pb-0.5">
                  Title or Position:
                </span>
                <span className="font-bold text-sm text-center border-b border-slate-900 grow px-1">
                  {creatorTitlePosition || ""}
                </span>
              </div>

              {/* Date */}
              <div className="flex items-end gap-1">
                <span className="font-serif text-[9px] shrink-0 pb-0.5">
                  Date:
                </span>
                <span className="font-bold text-sm text-center border-b border-slate-900 grow px-1">
                  {record.createdAt
                    ? new Date(record.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "2-digit",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: RECEIVED & REGISTERED */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900 font-serif text-[10px]">
          {/* 24. RECEIVED BY */}
          <div className="border-r-2 border-slate-900 p-1.5 space-y-1 pb-4 pt-3">
            <span className="font-bold block uppercase tracking-wider text-xs">
              24. RECEIVED BY
            </span>

            <div className="pt-1 space-y-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-700 shrink-0 text-xs mx-2">
                  Name:
                </span>
                <span className="font-bold text-slate-900 text-sm mx-6 border-b border-slate-900 grow">
                  {record.approvedBy || ""}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-700 shrink-0 text-xs mx-2">
                  Position:
                </span>
                <span className="font-bold text-slate-900 text-sm border-b border-slate-900 grow">
                  {approverTitlePosition || ""}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-700 shrink-0 text-xs mx-2">
                  Date:
                </span>
                <span className="font-bold text-slate-900 text-sm mx-7 border-b border-slate-900 grow">
                  {record.approvedAt
                    ? new Date(record.approvedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "2-digit",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
            </div>
          </div>

          {/* 25. REGISTERED AT CIVIL REGISTRAR */}
          <div className="border-slate-900 p-1.5 space-y-1 pb-4 pt-3">
            <span className="font-bold block uppercase tracking-wider text-xs">
              25. REGISTERED AT CIVIL REGISTRAR
            </span>

            <div className="pt-1 space-y-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-700 shrink-0 text-xs mx-2">
                  Name:
                </span>
                <span className="font-bold text-slate-900 text-sm mx-6 border-b border-slate-900 grow">
                  {record.submittedBy || ""}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-700 shrink-0 text-xs mx-2">
                  Position:
                </span>
                <span className="font-bold text-slate-900 text-sm border-b border-slate-900 grow">
                  {submitterTitlePosition || ""}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-700 shrink-0 text-xs mx-2">
                  Date:
                </span>
                <span className="font-bold text-slate-900 text-sm mx-7 border-b border-slate-900 grow">
                  {record.submittedAt
                    ? new Date(record.submittedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "2-digit",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* REMARKS */}
        <div className="border mt-3 border-slate-900 p-3 min-h-[100px] font-sans space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-slate-900 uppercase text-xs">
              REMARKS/ANNOTATIONS
            </span>
          </div>
          <div className="font-bold text-slate-900 px-1 whitespace-pre-wrap text-sm mx-10">
            {record.details?.remarks || record.notes || ""}
          </div>
        </div>
      </div>

      {/* Supporting Documents Block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs print:hidden">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
          Supporting Documents & Uploads
        </h2>
        {!record.supportingDocuments ||
        record.supportingDocuments.length === 0 ? (
          <span className="text-xs text-slate-400 italic block">
            No files attached to this record.
          </span>
        ) : (
          <div className="space-y-2">
            {record.supportingDocuments.map((doc: string, idx: number) => {
              const isCombined = doc.includes("|");
              const displayName = isCombined ? doc.split("|")[0] : doc;
              const downloadUrl = isCombined
                ? doc.split("|")[1]
                : doc.startsWith("http") || doc.startsWith("/")
                  ? doc
                  : `/uploads/${doc}`;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl text-xs font-semibold"
                >
                  <span className="text-slate-700 truncate max-w-[200px]">
                    {displayName}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setPreviewFile({ name: displayName, url: downloadUrl })
                      }
                      className="text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </button>
                    <a
                      href={downloadUrl}
                      download={displayName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Widget for MRO */}
        {record.status === "PENDING_VERIFICATION" &&
          (user?.role === "MRO" || user?.role === "ADMIN") && (
            <div className="pt-2">
              <label className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingDoc}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                {uploadingDoc ? (
                  <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
                ) : (
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                )}
                <span className="text-xs text-slate-600 font-bold">
                  {uploadingDoc
                    ? "Uploading document..."
                    : "Upload Additional Document"}
                </span>
                <span className="text-[10px] text-slate-400">
                  PDF, PNG, JPG (Max 4.5MB)
                </span>
              </label>
            </div>
          )}
      </div>

      {/* Role-Based Workflow Actions */}
      {/* <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs print:hidden">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Workflow Actions</h2>

        {actionLoading ? (
          <div className="flex items-center justify-center py-4 gap-2 text-teal-700 font-bold text-xs">
            <Loader2 className="h-5 w-5 animate-spin" /> Processing request...
          </div>
        ) : (
          <div className="space-y-3">
            {record.status === 'DRAFT' && (user?.role === 'MRO' || user?.role === 'ADMIN') && (
              <button
                onClick={() => handleAction(submitToPhysicianAction, 'Record submitted to physician for certification.')}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Submit to Physician for Certification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {record.status === 'PENDING_CERTIFICATION' && (user?.role === 'PHYSICIAN' || user?.role === 'ADMIN') && (
              <button
                onClick={() => handleAction(certifyBirthRecordAction, 'Medical details certified successfully.')}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <FileCheck className="h-4 w-4" />
                <span>Certify Medical Birth Details</span>
              </button>
            )}

            {record.status === 'PENDING_VERIFICATION' && (user?.role === 'MRO' || user?.role === 'ADMIN') && (
              <button
                onClick={handleVerifyComplete}
                disabled={uploadingDoc}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                <FileCheck className="h-4 w-4" />
                <span>Complete Verification & Submit to CRO</span>
              </button>
            )}

            {record.status === 'PENDING_APPROVAL' && (user?.role === 'CRO' || user?.role === 'ADMIN') && (
              <button
                onClick={() => handleAction(approveBirthRecordAction, 'Birth certificate approved and dispatched to Local Civil Registrar.')}
                className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Approve & Submit to Local Registrar</span>
              </button>
            )}

            {record.status === 'SUBMITTED_LCR' && (user?.role === 'LCR' || user?.role === 'ADMIN') && (
              <button
                onClick={() => handleAction(finalizeLCRBirthAction, 'Civil registry finalized and record locked in Archives.')}
                className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Archive className="h-4 w-4" />
                <span>Finalize, Register & Archive Record</span>
              </button>
            )}

            {record.status !== 'ARCHIVED' && (
              <p className="text-[11px] text-slate-500 text-center">
                Current stage requires action from authorized{' '}
                <span className="font-bold text-slate-700">
                  {record.status === 'DRAFT'
                    ? 'MRO'
                    : record.status === 'PENDING_CERTIFICATION'
                    ? 'Physician'
                    : record.status === 'PENDING_VERIFICATION'
                    ? 'MRO'
                    : record.status === 'PENDING_APPROVAL'
                    ? 'CRO'
                    : 'LCR'}
                </span>{' '}
                personnel.
              </p>
            )}

            {record.status === 'ARCHIVED' && (
              <div className="p-3 bg-green-100/70 border border-green-200 rounded-xl text-center text-xs text-green-800 font-semibold">
                This civil registry document is fully finalized and archived. No further actions are required.
              </div>
            )}
          </div>
        )}
      </div> */}

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm truncate">
                {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 rounded-xl p-2 min-h-[300px] flex items-center justify-center">
              {previewFile.url.endsWith(".pdf") ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[500px] rounded-lg"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[500px] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
