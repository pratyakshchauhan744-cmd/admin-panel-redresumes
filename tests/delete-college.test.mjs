import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { deleteSuspendedColleges, parseOptions } from "../prisma/seed-delete-college.mjs";

const college = {
  id: "college-123",
  name: "Example College",
  code: "EXAMPLE",
  status: "suspended",
  creditAccount: { balance: 100 },
  _count: {
    users: 2,
    faculties: 1,
    students: 1,
    invitations: 1,
    creditTransactions: 1,
    resumes: 1,
    interviewSessions: 1,
    auditLogs: 1,
  },
};

function database(records = [college], { deletionError, changeStatusBeforeDelete = false } = {}) {
  const calls = { reads: [], deletes: [], transactions: [] };
  let stored = structuredClone(records);
  const matches = (record, where) => (!where.status || record.status === where.status)
    && (!where.id?.in || where.id.in.includes(record.id));
  const prisma = {
    $transaction: async (callback, options) => {
      calls.transactions.push(options);
      const original = structuredClone(stored);
      try {
        return await callback({
          college: {
            findMany: async (query) => {
              calls.reads.push(query);
              return structuredClone(stored.filter((record) => matches(record, query.where)));
            },
            deleteMany: async (query) => {
              calls.deletes.push(query);
              if (deletionError) throw deletionError;
              if (changeStatusBeforeDelete) stored[0].status = "active";
              const deleted = stored.filter((record) => matches(record, query.where));
              stored = stored.filter((record) => !matches(record, query.where));
              return { count: deleted.length };
            },
          },
        });
      } catch (error) {
        stored = original;
        throw error;
      }
    },
  };
  return { prisma, calls, remaining: () => structuredClone(stored) };
}

test("accepts deletion without an email and the optional dry-run flag", () => {
  assert.deepEqual(parseOptions([]), { dryRun: false });
  assert.deepEqual(parseOptions(["--dry-run"]), { dryRun: true });
  assert.deepEqual(parseOptions(["--help"]), { help: true });
});

test("rejects unsupported flags and positional arguments", () => {
  assert.throws(() => parseOptions(["--unknown"]), /Unknown option/);
  assert.throws(() => parseOptions(["college@example.edu"]), /Unexpected argument/);
});

test("previews all suspended colleges without changing records", async () => {
  const secondCollege = { ...college, id: "college-456", code: "SECOND" };
  const records = [college, secondCollege, { ...college, id: "active-college", status: "active" }];
  const { prisma, calls, remaining } = database(records);
  const result = await deleteSuspendedColleges(prisma, { dryRun: true });
  assert.equal(result.deletedCount, 0);
  assert.deepEqual(result.colleges, [college, secondCollege]);
  assert.equal(calls.deletes.length, 0);
  assert.deepEqual(remaining(), records);
  assert.deepEqual(calls.reads[0].where, { status: "suspended" });
  assert.equal(calls.reads[0].take, undefined);
});

test("deletes all suspended colleges and preserves every other status", async () => {
  const secondCollege = { ...college, id: "college-456", code: "SECOND" };
  const retained = ["active", "inactive", "unknown"].map((status) => ({ ...college, id: status, status }));
  const { prisma, calls, remaining } = database([college, secondCollege, ...retained]);
  const result = await deleteSuspendedColleges(prisma);
  assert.equal(result.deletedCount, 2);
  assert.deepEqual(result.colleges, [college, secondCollege]);
  assert.deepEqual(remaining(), retained);
  assert.deepEqual(calls.deletes, [{ where: {
    id: { in: [college.id, secondCollege.id] },
    status: "suspended",
  } }]);
  assert.equal(calls.transactions[0].isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
});

for (const dryRun of [false, true]) {
  test(`handles no suspended colleges (${dryRun ? "preview" : "delete"})`, async () => {
    const records = [{ ...college, status: "active" }];
    const { prisma, calls, remaining } = database(records);
    const result = await deleteSuspendedColleges(prisma, { dryRun });
    assert.deepEqual(result, { colleges: [], deletedCount: 0 });
    assert.equal(calls.deletes.length, 0);
    assert.deepEqual(remaining(), records);
  });
}

test("handles an empty database without attempting a delete", async () => {
  const { prisma, calls } = database([]);
  assert.deepEqual(await deleteSuspendedColleges(prisma), { colleges: [], deletedCount: 0 });
  assert.equal(calls.deletes.length, 0);
});

test("reports deletion failures instead of claiming success", async () => {
  const { prisma, remaining } = database([college], { deletionError: new Error("Database delete failed") });
  await assert.rejects(deleteSuspendedColleges(prisma), /Database delete failed/);
  assert.deepEqual(remaining(), [college]);
});

test("cancels the transaction if a selected college stops being suspended", async () => {
  const secondCollege = { ...college, id: "college-456" };
  const { prisma, remaining } = database([college, secondCollege], { changeStatusBeforeDelete: true });
  await assert.rejects(deleteSuspendedColleges(prisma), /College statuses changed during deletion/);
  assert.deepEqual(remaining(), [college, secondCollege]);
});
