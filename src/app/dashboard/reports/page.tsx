'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { generateReportDataAction, ReportRecord } from '@/app/actions/reports';
import { RecordStatus } from '@/lib/types';
import {
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  FileDown,
  CalendarDays,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

// Custom Tooltip
const CustomSystemTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-2.5 rounded-xl shadow-xl text-xs text-slate-100 space-y-1">
        <p className="font-bold text-slate-300 border-b border-slate-700/60 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-400 capitalize">{entry.name}:</span>
            <span className="font-extrabold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// SVG Gender Pictograms
const MaleIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 36"
    className={`h-7 w-5 transition-colors ${
      active ? 'text-sky-400 fill-sky-400' : 'text-slate-200 fill-slate-200'
    }`}
  >
    <circle cx="12" cy="5" r="4" />
    <path d="M6 11c0-1 1-2 2-2h8c1 0 2 1 2 2v10h-3v12h-6V21H6V11z" />
  </svg>
);

const FemaleIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 36"
    className={`h-7 w-5 transition-colors ${
      active ? 'text-fuchsia-400 fill-fuchsia-400' : 'text-slate-200 fill-slate-200'
    }`}
  >
    <circle cx="12" cy="5" r="4" />
    <path d="M8 10h8l2 11h-4v12h-4V21H6L8 10z" />
  </svg>
);

export default function ReportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BIRTHS' | 'DEATHS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'ALL'>('ALL');

  // Trend Period Control
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL_TIME');

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const res = await generateReportDataAction(
        startDate || undefined,
        endDate || undefined,
        typeFilter,
        statusFilter
      );
      setData(res);
    } catch (e) {
      toast.error('Failed to compile report datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, typeFilter, statusFilter]);

  // Combined Birth & Death Trend Data for Dual Slopes
  const combinedTrendData = useMemo(() => {
    const now = new Date();
    const filtered = data.filter((r) => {
      if (selectedPeriod === 'ALL_TIME') return true;
      const recordDate = new Date(r.date);
      if (isNaN(recordDate.getTime())) return false;

      if (selectedPeriod === 'THIS_WEEK') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return recordDate >= startOfWeek;
      }

      const monthIndex = parseInt(selectedPeriod, 10);
      if (!isNaN(monthIndex)) {
        return recordDate.getMonth() === monthIndex;
      }

      return true;
    });

    const counts: Record<string, { Births: number; Deaths: number }> = {};

    filtered.forEach((r) => {
      const dateKey = r.date || 'Unknown';
      if (!counts[dateKey]) {
        counts[dateKey] = { Births: 0, Deaths: 0 };
      }
      if (r.type === 'BIRTH') counts[dateKey].Births += 1;
      if (r.type === 'DEATH') counts[dateKey].Deaths += 1;
    });

    return Object.keys(counts)
      .sort()
      .map((date) => ({
        date,
        Births: counts[date].Births,
        Deaths: counts[date].Deaths,
      }));
  }, [data, selectedPeriod]);

  const genderDemographics = useMemo(() => {
    const births = data.filter((r) => r.type === 'BIRTH');
    const deaths = data.filter((r) => r.type === 'DEATH');

    let birthMale = 0;
    let birthFemale = 0;

    births.forEach((r: any) => {
      const val = String(r.childGender || r.gender || r.sex || '').trim().toUpperCase();
      if (val === 'MALE' || val === 'M' || val.startsWith('M')) {
        birthMale++;
      } else if (val === 'FEMALE' || val === 'F' || val.startsWith('F')) {
        birthFemale++;
      }
    });

    let deathMale = 0;
    let deathFemale = 0;

    deaths.forEach((r: any) => {
      const val = String(r.deceasedGender || r.gender || r.sex || '').trim().toUpperCase();
      if (val === 'MALE' || val === 'M' || val.startsWith('M')) {
        deathMale++;
      } else if (val === 'FEMALE' || val === 'F' || val.startsWith('F')) {
        deathFemale++;
      }
    });

    const totalBirths = births.length;
    const totalDeaths = deaths.length;

    const birthMalePct = totalBirths > 0 ? Math.round((birthMale / totalBirths) * 100) : 0;
    const birthFemalePct = totalBirths > 0 ? Math.round((birthFemale / totalBirths) * 100) : 0;

    const deathMalePct = totalDeaths > 0 ? Math.round((deathMale / totalDeaths) * 100) : 0;
    const deathFemalePct = totalDeaths > 0 ? Math.round((deathFemale / totalDeaths) * 100) : 0;

    return {
      births: {
        male: birthMale,
        female: birthFemale,
        total: totalBirths,
        malePct: birthMalePct,
        femalePct: birthFemalePct,
      },
      deaths: {
        male: deathMale,
        female: deathFemale,
        total: totalDeaths,
        malePct: deathMalePct,
        femalePct: deathFemalePct,
      },
    };
  }, [data]);

  // Exporters
  const handleExportExcel = () => {
    if (data.length === 0) return toast.error('No registry data matches current filters.');
    try {
      const formatData = data.map((r) => ({
        'Certificate Number': r.certificateNumber,
        Type: r.type === 'BIRTH' ? 'Birth Certificate' : 'Death Certificate',
        'Record Name': r.name,
        'Event Date': r.date,
        'Registry Status': r.status,
        'Clinical Details': r.details,
        'Catalog Date': new Date(r.createdAt).toLocaleDateString(),
      }));
      const worksheet = XLSX.utils.json_to_sheet(formatData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'APEMDH Civil Registry');
      XLSX.writeFile(workbook, `apemdh_civil_registry_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Spreadsheet exported successfully.');
    } catch {
      toast.error('Failed to compile Excel file.');
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return toast.error('No registry data matches current filters.');
    try {
      const headers = ['Certificate Number', 'Type', 'Record Name', 'Event Date', 'Registry Status', 'Clinical Details', 'Catalog Date'];
      const rows = data.map((r) => [
        r.certificateNumber,
        r.type,
        `"${r.name.replace(/"/g, '""')}"`,
        r.date,
        r.status,
        `"${r.details.replace(/"/g, '""')}"`,
        new Date(r.createdAt).toLocaleDateString(),
      ]);
      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `apemdh_civil_registry_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV report downloaded successfully.');
    } catch {
      toast.error('Failed to compile CSV report.');
    }
  };

  const handleExportPDF = () => {
    if (data.length === 0) return toast.error('No registry data matches current filters.');
    try {
      const doc = new jsPDF();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 118, 110);
      doc.text('Alfonso Ponce Enrile Memorial District Hospital', 14, 15);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Gonzaga, Cagayan - Civil Registry Department', 14, 20);
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(50);
      doc.text('Statistical Summary & Civil Registry Report', 14, 28);
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Generated By: ${user?.name} (${user?.role})`, 14, 34);
      doc.text(`Period Covered: ${startDate || 'Beginning'} to ${endDate || 'Present'}`, 14, 39);
      doc.text(`Total Records: ${data.length} (${data.filter((r) => r.type === 'BIRTH').length} Births / ${data.filter((r) => r.type === 'DEATH').length} Deaths)`, 14, 44);

      const tableRows = data.map((r) => [
        r.certificateNumber,
        r.type === 'BIRTH' ? 'Birth Cert' : 'Death Cert',
        r.name,
        r.date,
        r.status,
      ]);

      autoTable(doc, {
        head: [['Certificate #', 'Record Type', 'Patient Name', 'Event Date', 'Registry Status']],
        body: tableRows,
        startY: 50,
        styles: { fontSize: 8, font: 'Helvetica' },
        headStyles: { fillColor: [15, 118, 110] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`apemdh_civil_registry_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report generated and downloaded.');
    } catch {
      toast.error('Failed to render PDF report.');
    }
  };

  const birthCount = data.filter((r) => r.type === 'BIRTH').length;
  const deathCount = data.filter((r) => r.type === 'DEATH').length;

  const maxBirthPeak = Math.max(...combinedTrendData.map((d) => d.Births), 1);
  const maxDeathPeak = Math.max(...combinedTrendData.map((d) => d.Deaths), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-teal-800 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Civil Registry Analytics
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">
            Reports & Data Analytics
          </h1>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>Report Compilation Filters</span>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className="text-slate-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500">Document Category</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="ALL">All Documents (Birth/Death)</option>
              <option value="BIRTHS">Birth Certificates Only</option>
              <option value="DEATHS">Death Certificates Only</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500">Workflow Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RecordStatus | 'ALL')}
              className="input-field"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_CERTIFICATION">Pending MD Cert</option>
              <option value="PENDING_VERIFICATION">Pending MRO Verify</option>
              <option value="PENDING_APPROVAL">Pending CRO Approve</option>
              <option value="SUBMITTED_LCR">Submitted to LCR</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Compiled Records</span>
          <span className="text-2xl font-black text-slate-800 block">{data.length}</span>
          <span className="text-[10px] text-slate-500 block">Matching current filters</span>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs text-center space-y-1 border-l-4 border-l-blue-600">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Birth Registries</span>
          <span className="text-2xl font-black text-blue-700 block">{birthCount}</span>
          <span className="text-[10px] text-slate-500 block">Total births logged</span>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs text-center space-y-1 border-l-4 border-l-rose-600">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Death Registries</span>
          <span className="text-2xl font-black text-rose-700 block">{deathCount}</span>
          <span className="text-[10px] text-slate-500 block">Total deaths logged</span>
        </div>
      </div>

      {/* Analytics Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* GENDER DEMOGRAPHICS */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-6">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">GENDER DEMOGRAPHICS</h3>
                <p className="text-[10px] text-slate-400">Comparative male and female breakdown across categories</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              {data.length} Total Records
            </span>
          </div>

          {/* Row 1 Summary Badges */}
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
            <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-sky-900 font-bold">Birth Records</span>
              <span className="font-mono text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-md text-[11px]">
                {genderDemographics.births.total} Total
              </span>
            </div>
            <div className="bg-fuchsia-50/60 border border-fuchsia-100 rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-fuchsia-900 font-bold">Death Records</span>
              <span className="font-mono text-fuchsia-700 bg-fuchsia-100/80 px-2 py-0.5 rounded-md text-[11px]">
                {genderDemographics.deaths.total} Total
              </span>
            </div>
          </div>

          {/* Two-Column Split Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            
            {/* LEFT COLUMN: MALE DEMOGRAPHICS */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Male Statistics</span>
                </div>
              </div>

              {/* Male Births */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Birth Registries</span>
                  <span className="font-mono font-bold text-sky-600">
                    {genderDemographics.births.male} Male ({genderDemographics.births.malePct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto py-1">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const activeCount = Math.round((genderDemographics.births.malePct / 100) * 10);
                      return <MaleIcon key={`male-birth-${i}`} active={i < activeCount} />;
                    })}
                  </div>
                  <span className="text-xl font-black text-sky-500 font-mono min-w-[50px] text-right">
                    {genderDemographics.births.malePct}%
                  </span>
                </div>
              </div>

              {/* Male Deaths */}
              <div className="space-y-2 pt-2 border-t border-slate-200/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Death Registries</span>
                  <span className="font-mono font-bold text-sky-600">
                    {genderDemographics.deaths.male} Male ({genderDemographics.deaths.malePct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto py-1">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const activeCount = Math.round((genderDemographics.deaths.malePct / 100) * 10);
                      return <MaleIcon key={`male-death-${i}`} active={i < activeCount} />;
                    })}
                  </div>
                  <span className="text-xl font-black text-sky-500 font-mono min-w-[50px] text-right">
                    {genderDemographics.deaths.malePct}%
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: FEMALE DEMOGRAPHICS */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Female Statistics</span>
                </div>
              </div>

              {/* Female Births */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Birth Registries</span>
                  <span className="font-mono font-bold text-fuchsia-600">
                    {genderDemographics.births.female} Female ({genderDemographics.births.femalePct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto py-1">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const activeCount = Math.round((genderDemographics.births.femalePct / 100) * 10);
                      return <FemaleIcon key={`female-birth-${i}`} active={i < activeCount} />;
                    })}
                  </div>
                  <span className="text-xl font-black text-fuchsia-500 font-mono min-w-[50px] text-right">
                    {genderDemographics.births.femalePct}%
                  </span>
                </div>
              </div>

              {/* Female Deaths */}
              <div className="space-y-2 pt-2 border-t border-slate-200/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Death Registries</span>
                  <span className="font-mono font-bold text-fuchsia-600">
                    {genderDemographics.deaths.female} Female ({genderDemographics.deaths.femalePct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto py-1">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const activeCount = Math.round((genderDemographics.deaths.femalePct / 100) * 10);
                      return <FemaleIcon key={`female-death-${i}`} active={i < activeCount} />;
                    })}
                  </div>
                  <span className="text-xl font-black text-fuchsia-500 font-mono min-w-[50px] text-right">
                    {genderDemographics.deaths.femalePct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Legend */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span>Male Indicator</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
              <span>Female Indicator</span>
            </div>
          </div>
        </div>

        {/* DUAL SLOPING TREND GRAPH FOR BIRTH & DEATH RECORDS */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">TOTAL RECORDS TREND SLOPES</h3>
                <p className="text-[10px] text-slate-400">Birth and death comparative curves</p>
              </div>
            </div>

            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg pr-7 pl-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="ALL_TIME">All Time</option>
                <option value="THIS_WEEK">Within This Week</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="h-64 w-full">
            {combinedTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No record trend data available for selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedTrendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="birthSlopeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="deathSlopeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomSystemTooltip />} />

                  <ReferenceLine y={maxBirthPeak} stroke="#2563eb" strokeDasharray="3 3" />
                  <ReferenceLine y={maxDeathPeak} stroke="#e11d48" strokeDasharray="3 3" />

                  <Area
                    type="natural"
                    dataKey="Births"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#birthSlopeGrad)"
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                  />

                  <Area
                    type="natural"
                    dataKey="Deaths"
                    stroke="#e11d48"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#deathSlopeGrad)"
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-slate-600">Birth Slope Trend</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
              <span className="text-slate-600">Death Slope Trend</span>
            </div>
          </div>
        </div>

      </div>

      {/* Export Operations */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm">Download Operations</h3>
          <p className="text-[10px] text-slate-400">Select your preferred export layout under hospital compliance guidelines.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-teal-600 hover:bg-teal-50/10 rounded-2xl transition-all duration-200 text-left cursor-pointer"
          >
            <div className="p-3 bg-red-50 text-red-700 rounded-xl shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-xs block">Export PDF Document</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Styled document with tables</span>
            </div>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-teal-600 hover:bg-teal-50/10 rounded-2xl transition-all duration-200 text-left cursor-pointer"
          >
            <div className="p-3 bg-green-50 text-green-700 rounded-xl shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-xs block">Export Excel Sheet</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Data spreadsheet for analysis</span>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-3 p-4 border border-slate-200 hover:border-teal-600 hover:bg-teal-50/10 rounded-2xl transition-all duration-200 text-left cursor-pointer"
          >
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl shrink-0">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-xs block">Export CSV Text</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Raw spreadsheet comma file</span>
            </div>
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Report Preview ({data.length} items found)</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Live Preview
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-teal-700/20 border-t-teal-700 rounded-full animate-spin" />
            <span className="text-xs text-slate-500">Querying registry datasets...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 italic">No records match filter range.</div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Certificate #</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Event Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Demographics/Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((r) => (
                  <tr
                    key={r.certificateNumber}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800">{r.certificateNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{r.name}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {r.type === 'BIRTH' ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Birth Certificate</span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Death Certificate</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{r.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-600">{r.status}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{r.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 10 && (
              <div className="p-3 text-center text-slate-400 font-medium border-t border-slate-50">
                And {data.length - 10} more records. Perform export to download complete dataset.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}