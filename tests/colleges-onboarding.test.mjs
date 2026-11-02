import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/actions/colleges.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});
const input = {
  name: "Example College",
  code: "EXAMPLE",
  domain: "example.edu",
  contactEmail: "placements@example.edu",
  mainFacultyName: "Faculty Admin",
  mainFacultyEmail: " Faculty@Example.edu ",
  password: "Campus123!",
};

function loadOnboarding({ emailResult, portalError } = {}) {
  const calls = { emails: [], colleges: [], faculty: [], revalidated: [] };
  const transaction = {
    college: { create: async ({ data }) => {
      calls.colleges.push(data);
      return { id: "college-123", ...data };
    } },
    collegeCreditAccount: { create: async () => ({}) },
    user: {
      findUnique: async () => null,
      create: async ({ data }) => {
        calls.faculty.push(data);
        return { id: "faculty-123", ...data };
      },
    },
    collegeFaculty: { findUnique: async () => null, create: async () => ({}) },
    invitation: { create: async () => ({}) },
  };
  const dependencies = {
    "next/cache": { revalidatePath: (path) => calls.revalidated.push(path) },
    bcryptjs: { hash: async () => "mock-password-hash" },
    "@/lib/prisma": { prisma: {
      college: { findFirst: async () => null },
      user: { findUnique: async () => ({ id: "admin-123" }) },
      $transaction: async (callback) => callback(transaction),
    } },
    "@/lib/auth": { ensureAuthorized: async () => ({ userId: "admin-123" }) },
    "@/lib/audit": { logAdminAction: async () => {} },
    "@/lib/dashboard-queries": { invalidateTelemetryCache: () => {} },
    "@/lib/college-queries": { invalidateCollegeStatsCache: () => {} },
    "@/lib/email": {
      getInstitutionLoginUrl: () => {
        if (portalError) throw new Error(portalError);
        return "https://campus.example.com/login?portal=enterprise";
      },
      sendInstitutionWelcomeEmail: async (payload) => {
        calls.emails.push(payload);
        return emailResult || { success: true, messageId: "email-123" };
      },
    },
  };
  const exported = {};
  runInNewContext(outputText, {
    exports: exported,
    Error,
    require: (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    console: { error: () => {}, warn: () => {} },
  });
  return { createCollege: exported.createCollege, calls };
}

test("onboards the account and emails both addresses with the faculty login ID", async () => {
  const { createCollege, calls } = loadOnboarding();
  const result = await createCollege(input);
  assert.equal(result.success, true);
  assert.equal(result.emailSent, true);
  assert.equal(result.facultyEmail, "faculty@example.edu");
  assert.deepEqual(Array.from(result.emailRecipients), ["faculty@example.edu", "placements@example.edu"]);
  assert.equal(calls.emails.length, 1);
  assert.deepEqual(Array.from(calls.emails[0].to), ["faculty@example.edu", "placements@example.edu"]);
  assert.equal(calls.emails[0].loginEmail, "faculty@example.edu");
  assert.equal(calls.emails[0].password, input.password);
  assert.equal(calls.faculty[0].email, "faculty@example.edu");
  assert.equal(calls.faculty[0].passwordHash, "mock-password-hash");
  assert.deepEqual(calls.revalidated, ["/admin/colleges"]);
});

test("preserves the created account and exposes the email failure for admin recovery", async () => {
  const { createCollege, calls } = loadOnboarding({
    emailResult: { success: false, error: "Resend rejected the email (HTTP 403): Domain is not verified" },
  });
  const result = await createCollege(input);
  assert.equal(result.success, true);
  assert.equal(result.emailSent, false);
  assert.match(result.emailError, /Domain is not verified/);
  assert.equal(result.tempPassword, input.password);
  assert.equal(calls.colleges.length, 1);
});

test("reports portal configuration failure without sending a broken login link", async () => {
  const { createCollege, calls } = loadOnboarding({ portalError: "Configure a public HTTPS institution portal URL" });
  const result = await createCollege(input);
  assert.equal(result.success, true);
  assert.equal(result.emailSent, false);
  assert.match(result.emailError, /public HTTPS/);
  assert.equal(result.tempPassword, input.password);
  assert.equal(calls.emails.length, 0);
});

test("sends only one copy when the contact and faculty addresses are the same", async () => {
  const { createCollege, calls } = loadOnboarding();
  const result = await createCollege({ ...input, contactEmail: "Faculty@Example.edu" });
  assert.equal(result.success, true);
  assert.deepEqual(Array.from(calls.emails[0].to), ["faculty@example.edu"]);
});

test("uses the faculty address when the optional placement email is empty", async () => {
  const { createCollege, calls } = loadOnboarding();
  const result = await createCollege({ ...input, contactEmail: "" });
  assert.equal(result.success, true);
  assert.deepEqual(Array.from(calls.emails[0].to), ["faculty@example.edu"]);
});

test("rejects an invalid placement email before creating an account", async () => {
  const { createCollege, calls } = loadOnboarding();
  const result = await createCollege({ ...input, contactEmail: "not-an-email" });
  assert.equal(result.success, false);
  assert.match(result.error, /Official \/ Placement email must be valid/);
  assert.equal(calls.colleges.length, 0);
  assert.equal(calls.emails.length, 0);
});
