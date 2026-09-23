import { prisma } from "./prisma";

export interface CollegeListFilter {
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
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

  try {
    const [colleges, total] = await Promise.all([
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

    return {
      colleges,
      total,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error in getPaginatedColleges:", error);
    throw new Error("Failed to load college directory");
  }
}

export async function getCollegeStats() {
  try {
    const [totalColleges, activeColleges, totalStudents, totalFaculty, creditAccounts] =
      await Promise.all([
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

    return {
      totalColleges,
      activeColleges,
      totalStudents,
      totalFaculty,
      totalCreditsAllocated: creditAccounts._sum.totalAllocated || 0,
      totalCreditBalance: creditAccounts._sum.balance || 0,
      totalCreditsDistributed: creditAccounts._sum.totalDistributed || 0,
    };
  } catch (error) {
    console.error("Error in getCollegeStats:", error);
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
