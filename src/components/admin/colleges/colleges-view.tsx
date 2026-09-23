"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Plus,
  Coins,
  Search,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Shield,
  Layers,
  Phone,
  Mail,
  X,
} from "lucide-react";
import { createCollege, allocateCollegeCredits, updateCollegeStatus } from "@/actions/colleges";

interface CollegesViewProps {
  colleges: any[];
  stats: {
    totalColleges: number;
    activeColleges: number;
    totalStudents: number;
    totalFaculty: number;
    totalCreditsAllocated: number;
    totalCreditBalance: number;
    totalCreditsDistributed: number;
  };
  total: number;
  pages: number;
  currentPage: number;
}

export function CollegesView({
  colleges,
  stats,
  total,
  pages,
  currentPage,
}: CollegesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [creditModalCollege, setCreditModalCollege] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states - Onboarding
  const [onboardData, setOnboardData] = useState({
    name: "",
    code: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    initialCredits: 100,
    mainFacultyName: "",
    mainFacultyEmail: "",
    mainFacultyPhone: "",
    password: "",
  });

  // Form states - Credit Allocation
  const [creditData, setCreditData] = useState({
    amount: 50,
    description: "Semester credit allocation from Super Admin",
  });

  const [filterQuery, setFilterQuery] = useState(searchParams.get("query") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filterQuery) params.set("query", filterQuery);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", "1");
    router.push(`/admin/colleges?${params.toString()}`);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    const params = new URLSearchParams();
    if (filterQuery) params.set("query", filterQuery);
    if (newStatus !== "all") params.set("status", newStatus);
    params.set("page", "1");
    router.push(`/admin/colleges?${params.toString()}`);
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await createCollege({
        ...onboardData,
        initialCredits: Number(onboardData.initialCredits),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `College "${onboardData.name}" onboarded successfully! Welcome email with login credentials has been sent to ${res.facultyEmail}. (Password: ${res.tempPassword})`,
        });
        setIsOnboardOpen(false);
        setOnboardData({
          name: "",
          code: "",
          domain: "",
          contactEmail: "",
          contactPhone: "",
          initialCredits: 100,
          mainFacultyName: "",
          mainFacultyEmail: "",
          mainFacultyPhone: "",
          password: "",
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to onboard college",
        });
      }
    });
  };

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalCollege) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await allocateCollegeCredits({
        collegeId: creditModalCollege.id,
        amount: Number(creditData.amount),
        description: creditData.description,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Successfully allocated ${creditData.amount} credits to ${creditModalCollege.name}. New Balance: ${res.balance}`,
        });
        setCreditModalCollege(null);
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to allocate credits",
        });
      }
    });
  };

  const handleToggleStatus = (college: any) => {
    const nextStatus = college.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    startTransition(async () => {
      const res = await updateCollegeStatus({
        collegeId: college.id,
        status: nextStatus,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `${college.name} status updated to ${nextStatus}`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update status",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Colleges
            </span>
            <Building2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats.totalColleges}
            </span>
            <span className="text-xs font-medium text-emerald-400">
              {stats.activeColleges} active
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Enrolled Students
            </span>
            <GraduationCap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats.totalStudents.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Faculty / Admins
            </span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats.totalFaculty.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Credits Allocated
            </span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">
              {stats.totalCreditsAllocated.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ({stats.totalCreditBalance.toLocaleString()} available)
            </span>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
              : "bg-rose-950/40 border-rose-800/60 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control / Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by college name, code (e.g. MIT), domain, or contact email..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_ONBOARDING">Pending</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-all"
          >
            Filter
          </button>
        </form>

        <button
          onClick={() => setIsOnboardOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Onboard New College
        </button>
      </div>

      {/* Colleges Table */}
      <div className="glass-panel rounded-xl border border-zinc-800/80 shadow-sm overflow-hidden select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-6 py-4">College / University</th>
                <th className="px-6 py-4">Domain / Code</th>
                <th className="px-6 py-4">Main Faculty Admin</th>
                <th className="px-6 py-4">Enrolled / Faculty</th>
                <th className="px-6 py-4">Credit Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-xs">
              {colleges.length > 0 ? (
                colleges.map((college) => {
                  const mainFaculty = college.faculties?.[0]?.user;
                  const creditBalance = college.creditAccount?.balance ?? 0;
                  const totalAllocated = college.creditAccount?.totalAllocated ?? 0;

                  return (
                    <tr
                      key={college.id}
                      className="hover:bg-zinc-900/20 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-850 flex items-center justify-center font-bold text-rose-400 border border-zinc-800 shrink-0">
                            {college.code.substring(0, 3)}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-100 block">
                              {college.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ID: {college.id.substring(0, 12)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Domain & Code */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-semibold text-zinc-300">
                            {college.code}
                          </span>
                          <span className="block text-[11px] text-zinc-400 font-mono truncate max-w-[180px]">
                            {college.domain}
                          </span>
                        </div>
                      </td>

                      {/* Main Faculty */}
                      <td className="px-6 py-4">
                        {mainFaculty ? (
                          <div>
                            <span className="font-medium text-zinc-200 block">
                              {mainFaculty.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono block">
                              {mainFaculty.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      {/* Counts */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <span className="text-sky-400 font-semibold">
                            {college._count?.students || 0} students
                          </span>
                          <span className="block text-zinc-500">
                            {college._count?.faculties || 0} faculty
                          </span>
                        </div>
                      </td>

                      {/* Credit Balance */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="text-emerald-400 font-mono font-bold text-sm block">
                            {creditBalance.toLocaleString()} cr
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Total: {totalAllocated.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            college.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : college.status === "PENDING_ONBOARDING"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full bg-current ${
                              college.status === "ACTIVE" ? "animate-pulse" : ""
                            }`}
                          />
                          {college.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setCreditModalCollege(college)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
                            title="Allocate interview credits"
                          >
                            <Coins className="w-3.5 h-3.5 text-emerald-400" />
                            Allocate Credits
                          </button>

                          <button
                            onClick={() => handleToggleStatus(college)}
                            disabled={isPending}
                            className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              college.status === "ACTIVE"
                                ? "bg-zinc-900 hover:bg-rose-950/30 border-zinc-800 hover:border-rose-800/60 text-zinc-400 hover:text-rose-400"
                                : "bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-800/60 text-emerald-300"
                            }`}
                          >
                            {college.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No colleges found matching the current search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Modal */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Onboard New University / College</h3>
                  <p className="text-xs text-zinc-400">
                    Creates tenant partition, registers main faculty administrator, and provisions initial interview credit quota.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOnboardOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                  1. Institution Profile
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      College Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Stanford University"
                      value={onboardData.name}
                      onChange={(e) => setOnboardData({ ...onboardData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      College Code (Unique Tag) *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. STANFORD"
                      value={onboardData.code}
                      onChange={(e) =>
                        setOnboardData({ ...onboardData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 uppercase focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Domain / Subdomain *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. stanford.edu"
                      value={onboardData.domain}
                      onChange={(e) => setOnboardData({ ...onboardData, domain: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Initial Interview Credits *
                    </label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={onboardData.initialCredits}
                      onChange={(e) =>
                        setOnboardData({ ...onboardData, initialCredits: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                  2. Main Faculty Administrator
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Dr. Jane Smith"
                      value={onboardData.mainFacultyName}
                      onChange={(e) =>
                        setOnboardData({ ...onboardData, mainFacultyName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Official Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="faculty@stanford.edu"
                      value={onboardData.mainFacultyEmail}
                      onChange={(e) =>
                        setOnboardData({ ...onboardData, mainFacultyEmail: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={onboardData.mainFacultyPhone}
                      onChange={(e) =>
                        setOnboardData({ ...onboardData, mainFacultyPhone: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Initial Login Password (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to auto-generate secure password"
                      value={onboardData.password}
                      onChange={(e) =>
                        setOnboardData({ ...onboardData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      If left empty, a secure password is generated automatically. The credentials and enterprise portal link will be emailed to the administrator.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOnboardOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-rose-950/50 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Provisioning Campus...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5" />
                      Complete Campus Onboarding
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Allocation Modal */}
      {creditModalCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Allocate Interview Credits</h3>
                  <p className="text-xs text-zinc-400">{creditModalCollege.name}</p>
                </div>
              </div>
              <button
                onClick={() => setCreditModalCollege(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreditSubmit} className="space-y-4">
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Current College Balance:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {(creditModalCollege.creditAccount?.balance || 0).toLocaleString()} Credits
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Total Previously Allocated:</span>
                  <span className="font-mono text-zinc-300">
                    {(creditModalCollege.creditAccount?.totalAllocated || 0).toLocaleString()} Credits
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Credit Amount to Add *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={creditData.amount}
                  onChange={(e) => setCreditData({ ...creditData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description / Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={creditData.description}
                  onChange={(e) => setCreditData({ ...creditData, description: e.target.value })}
                  placeholder="e.g. Annual placement batch quota top-up (Approved by Admin)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreditModalCollege(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Allocating...
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5" />
                      Grant Credits
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
