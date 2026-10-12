import { prisma } from "./prisma";

export interface CollegeListFilter {
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// In-memory cache for college stats with a 30-second TTL to avoid proxy connection bottleneck
let cachedStats: { data: any; timestamp: number } | null = null;
const STATS_CACHE_TTL_MS = 30 * 1000;

export function invalidateCollegeStatsCache() {
  cachedStats = null;
}

export async function getPaginatedColleges(filters: CollegeListFilter = {}) {
  const page = filters.page || 1;
  const limit = filters.limit || 15;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: "insensitive" } },
      { code: { contains: filters.query, mode: "insensitive" } },
      { officialEmail: { contains: filters.query, mode: "insensitive" } },
      { website: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  if (filters.status && filters.status !== "all") {
    where.status = filters.status;
  }

  const queryFn = async () => {
    const [collegesResult, totalResult] = await Promise.allSettled([
      prisma.college.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          creditAccount: true,
          _count: {
            select: {
              students: true,
              faculties: true,
            },
          },
          faculties: {
            where: { isMainFaculty: true },
            take: 1,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      prisma.college.count({ where }),
    ]);

    const colleges = collegesResult.status === "fulfilled" ? collegesResult.value : [];
    const total = totalResult.status === "fulfilled" ? totalResult.value : colleges.length;

    if (collegesResult.status === "rejected") {
      console.warn("Colleges findMany error:", collegesResult.reason);
      throw collegesResult.reason;
    }

    return {
      colleges,
      total,
      pages: Math.ceil(total / limit) || 1,
    };
  };

  try {
    return await queryFn();
  } catch (firstError) {
    console.warn("First attempt failed in getPaginatedColleges, retrying once...", firstError);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return await queryFn();
    } catch (retryError) {
      console.error("Critical error in getPaginatedColleges after retry:", retryError);
      return {
        colleges: [],
        total: 0,
        pages: 1,
      };
    }
  }
}

export async function getCollegeStats(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedStats && now - cachedStats.timestamp < STATS_CACHE_TTL_MS) {
    return cachedStats.data;
  }

  try {
    const [
      totalCollegesRes,
      activeCollegesRes,
      totalStudentsRes,
      totalFacultyRes,
      creditAccountsRes,
    ] = await Promise.allSettled([
      prisma.college.count(),
      prisma.college.count({ where: { status: "active" } }),
      prisma.collegeStudent.count(),
      prisma.collegeFaculty.count(),
      prisma.collegeCreditAccount.aggregate({
        _sum: {
          totalAllocated: true,
          balance: true,
          totalDistributed: true,
        },
      }),
    ]);

    const totalColleges = totalCollegesRes.status === "fulfilled" ? totalCollegesRes.value : 0;
    const activeColleges = activeCollegesRes.status === "fulfilled" ? activeCollegesRes.value : 0;
    const totalStudents = totalStudentsRes.status === "fulfilled" ? totalStudentsRes.value : 0;
    const totalFaculty = totalFacultyRes.status === "fulfilled" ? totalFacultyRes.value : 0;
    const creditAccounts =
      creditAccountsRes.status === "fulfilled"
        ? creditAccountsRes.value
        : { _sum: { totalAllocated: 0, balance: 0, totalDistributed: 0 } };

    const data = {
      totalColleges,
      activeColleges,
      totalStudents,
      totalFaculty,
      totalCreditsAllocated: creditAccounts._sum.totalAllocated || 0,
      totalCreditBalance: creditAccounts._sum.balance || 0,
      totalCreditsDistributed: creditAccounts._sum.totalDistributed || 0,
    };

    cachedStats = { data, timestamp: Date.now() };
    return data;
  } catch (error) {
    console.error("Error in getCollegeStats:", error);
    if (cachedStats) {
      return cachedStats.data;
    }
    return {
      totalColleges: 0,
      activeColleges: 0,
      totalStudents: 0,
      totalFaculty: 0,
      totalCreditsAllocated: 0,
      totalCreditBalance: 0,
      totalCreditsDistributed: 0,
    };
  }
}

export async function getCollegeDetails(collegeId: string) {
  try {
    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        creditAccount: true,
        creditTransactions: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        faculties: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, isActive: true },
            },
          },
        },
        _count: {
          select: {
            students: true,
            faculties: true,
            invitations: true,
          },
        },
      },
    });

    return college;
  } catch (error) {
    console.error("Error in getCollegeDetails:", error);
    throw new Error("Failed to load college details");
  }
}
