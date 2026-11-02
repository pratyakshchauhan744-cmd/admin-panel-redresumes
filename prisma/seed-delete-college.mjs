import { Prisma, PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const usage = `Delete all colleges whose status is "suspended".

Usage:
  npm run seed:delete-college -- --dry-run
  npm run seed:delete-college

Options:
  --dry-run         Preview all suspended colleges without deleting them.
  --help            Show these instructions.

The command uses DATABASE_URL from the environment or the project's .env file.
Only colleges with status "suspended" can be deleted or previewed.
College profiles, invitations, and college credit records are deleted.
User accounts, resumes, interviews, and audit history are preserved.`;

export function parseOptions(args) {
  const { values } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: {
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) return { help: true };
  return { dryRun: values["dry-run"] };
}

export async function deleteSuspendedColleges(prisma, { dryRun = false } = {}) {
  return prisma.$transaction(async (tx) => {
    const colleges = await tx.college.findMany({
      where: { status: "suspended" },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        creditAccount: { select: { balance: true } },
        _count: {
          select: {
            users: true,
            faculties: true,
            students: true,
            invitations: true,
            creditTransactions: true,
            resumes: true,
            interviewSessions: true,
            auditLogs: true,
          },
        },
      },
    });

    if (dryRun || colleges.length === 0) {
      return { colleges, deletedCount: 0 };
    }

    // The schema cascades institutional records and clears collegeId on retained records.
    const { count } = await tx.college.deleteMany({
      where: {
        id: { in: colleges.map((college) => college.id) },
        status: "suspended",
      },
    });
    if (count !== colleges.length) {
      throw new Error("College statuses changed during deletion. The transaction was cancelled; run the script again.");
    }

    return { colleges, deletedCount: count };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 20000,
    timeout: 60000,
  });
}

async function main() {
  let prisma;
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) {
      console.log(usage);
      return;
    }

    // Existing environment variables take precedence over values in .env.
    try {
      process.loadEnvFile(".env");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!process.env.DATABASE_URL?.trim()) {
      throw new Error("Set DATABASE_URL in the environment or the project's .env file.");
    }

    prisma = new PrismaClient();
    const { colleges, deletedCount } = await deleteSuspendedColleges(prisma, options);
    if (colleges.length === 0) {
      console.log("No suspended colleges found.");
      return;
    }
    console.log(options.dryRun
      ? `Dry run — ${colleges.length} suspended college(s) would be deleted.`
      : `Deleted ${deletedCount} suspended college(s).`);
    for (const college of colleges) {
      const counts = college._count;
      console.log(`College: ${college.name} (${college.code}) | ID: ${college.id} | Status: ${college.status}`);
      console.log(`${options.dryRun ? "Would delete" : "Deleted"}: ${counts.faculties} faculty profiles, ${counts.students} student profiles, ${counts.invitations} invitations, ${counts.creditTransactions} college credit transactions, ${college.creditAccount ? 1 : 0} college credit account.`);
      console.log(`Preserved: ${counts.users} user accounts, ${counts.resumes} resumes, ${counts.interviewSessions} interviews, ${counts.auditLogs} enterprise audit records. Their college links are cleared when the college is deleted.`);
    }
    if (options.dryRun) console.log("No records were changed. Run the same command without --dry-run to delete all suspended colleges.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "College deletion failed.");
    process.exitCode = 1;
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
