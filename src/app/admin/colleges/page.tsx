import React from "react";
import { ensureAuthorized } from "@/lib/auth";
import { getPaginatedColleges, getCollegeStats } from "@/lib/college-queries";
import { PageContainer } from "@/components/admin/page-container";
import { CollegesView } from "@/components/admin/colleges/colleges-view";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CollegesPageProps {
  searchParams: Promise<{
    query?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminCollegesPage({ searchParams }: CollegesPageProps) {
  try {
    await ensureAuthorized(["admin", "manager"]);
  } catch (error) {
    return null;
  }

  const resolvedParams = await searchParams;
  const query = resolvedParams.query || "";
  const status = (resolvedParams.status as any) || "all";
  const page = parseInt(resolvedParams.page || "1", 10);
  const limit = 15;

  const [{ colleges, total, pages }, stats] = await Promise.all([
    getPaginatedColleges({ query, status, page, limit }),
    getCollegeStats(),
  ]);

  return (
    <PageContainer
      title="Colleges & Universities"
      description="Manage institutional campus tenants, provision interview credits, and monitor academic cohorts."
      action={
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg text-xs font-mono">
          <Building2 className="w-3.5 h-3.5 text-rose-500" />
          <span>{total} Total Institutions</span>
        </div>
      }
    >
      <CollegesView
        colleges={colleges}
        stats={stats}
        total={total}
        pages={pages}
        currentPage={page}
      />
    </PageContainer>
  );
}
