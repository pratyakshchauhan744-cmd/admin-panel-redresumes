import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, mock, test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/email.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { getInstitutionLoginUrl, sendInstitutionWelcomeEmail } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const envKeys = ["RESEND_API_KEY", "EMAIL_FROM", "NEXT_PUBLIC_APP_URL", "INSTITUTION_PORTAL_URL", "NODE_ENV"];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const input = {
  to: ["Faculty@example.edu", "placements@example.edu", "faculty@example.edu"],
  loginEmail: "faculty@example.edu",
  recipientName: "Faculty <Admin>",
  collegeName: "Example & College",
  collegeCode: "EXAMPLE",
  password: 'Campus<&"123!',
  loginUrl: "https://campus.example.com/login?portal=enterprise",
};
let request;
let logs;

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test_key_for_mock_requests";
  process.env.EMAIL_FROM = "RedResumes <campus@example.com>";
  process.env.NEXT_PUBLIC_APP_URL = "https://campus.example.com";
  delete process.env.INSTITUTION_PORTAL_URL;
  process.env.NODE_ENV = "test";
  logs = [];
  for (const method of ["error", "warn", "info", "log"]) {
    mock.method(console, method, (...args) => logs.push(args.join(" ")));
  }
  request = mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected network request");
  });
});

afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  assert.ok(logs.every((line) => !line.includes(input.password)), "Passwords must never be logged");
});

test("submits to both unique recipients and keeps the faculty address as the login ID", async () => {
  request.mock.mockImplementation(async () => Response.json({ id: "email-123" }));
  const result = await sendInstitutionWelcomeEmail(input);
  assert.deepEqual(result, { success: true, messageId: "email-123" });
  assert.equal(request.mock.callCount(), 1);
  const [url, options] = request.mock.calls[0].arguments;
  const payload = JSON.parse(options.body);
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(options.headers.Authorization, `Bearer ${process.env.RESEND_API_KEY}`);
  assert.equal(options.method, "POST");
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(payload.to, ["faculty@example.edu", "placements@example.edu"]);
  assert.equal(payload.from, process.env.EMAIL_FROM);
  assert.match(payload.html, /Login ID \(Main Faculty Email\):.*faculty@example\.edu/);
  assert.match(payload.html, /Faculty &lt;Admin&gt;/);
  assert.match(payload.html, /Example &amp; College/);
  assert.match(payload.html, /Campus&lt;&amp;&quot;123!/);
});

test("reports missing deployment configuration without contacting Resend", async () => {
  delete process.env.RESEND_API_KEY;
  process.env.EMAIL_FROM = " ";
  const result = await sendInstitutionWelcomeEmail(input);
  assert.equal(result.success, false);
  assert.match(result.error, /RESEND_API_KEY and EMAIL_FROM/);
  assert.equal(request.mock.callCount(), 0);
});

test("does not send without recipients", async () => {
  const result = await sendInstitutionWelcomeEmail({ ...input, to: [" "] });
  assert.equal(result.success, false);
  assert.equal(request.mock.callCount(), 0);
});

for (const [status, message] of [
  [401, "API key is invalid"],
  [403, "The example.com domain is not verified"],
  [429, "Too many requests"],
]) {
  test(`returns a real failure for a Resend ${status} response`, async () => {
    request.mock.mockImplementation(async () => Response.json({ name: "validation_error", message }, { status }));
    const result = await sendInstitutionWelcomeEmail(input);
    assert.equal(result.success, false);
    assert.ok(result.error.includes(String(status)));
    assert.ok(result.error.includes(message));
  });
}

test("handles non-JSON provider failures", async () => {
  request.mock.mockImplementation(async () => new Response("Gateway error", { status: 502 }));
  const result = await sendInstitutionWelcomeEmail(input);
  assert.equal(result.success, false);
  assert.match(result.error, /HTTP 502/);
});

for (const responseBody of [{}, { id: " " }, "not-json"]) {
  test(`requires an email ID before reporting success: ${JSON.stringify(responseBody)}`, async () => {
    request.mock.mockImplementation(async () => typeof responseBody === "string"
      ? new Response(responseBody)
      : Response.json(responseBody));
    const result = await sendInstitutionWelcomeEmail(input);
    assert.equal(result.success, false);
    assert.match(result.error, /email ID/);
  });
}

test("reports connection failures without logging the request or credentials", async () => {
  request.mock.mockImplementation(async () => { throw new Error(input.password); });
  const result = await sendInstitutionWelcomeEmail(input);
  assert.equal(result.success, false);
  assert.match(result.error, /connect to Resend/);
});

test("reports timeouts as unconfirmed submissions", async () => {
  request.mock.mockImplementation(async () => { throw new DOMException("Timed out", "TimeoutError"); });
  const result = await sendInstitutionWelcomeEmail(input);
  assert.equal(result.success, false);
  assert.match(result.error, /timed out/);
});

test("builds the existing enterprise login route without duplicate slashes", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://campus.example.com/";
  assert.equal(getInstitutionLoginUrl(), "https://campus.example.com/login?portal=enterprise");
});

test("supports the institution portal being separate from the admin panel", () => {
  process.env.INSTITUTION_PORTAL_URL = "https://enterprise.example.com/sign-in";
  process.env.NEXT_PUBLIC_APP_URL = "https://admin.example.com";
  assert.equal(getInstitutionLoginUrl(), "https://enterprise.example.com/sign-in");
});

test("requires a configured public HTTPS portal in production", () => {
  process.env.NODE_ENV = "production";
  delete process.env.NEXT_PUBLIC_APP_URL;
  assert.throws(getInstitutionLoginUrl, /Configure INSTITUTION_PORTAL_URL/);
  for (const url of ["http://localhost:3001", "https://127.0.0.1", "http://campus.example.com"]) {
    process.env.NEXT_PUBLIC_APP_URL = url;
    assert.throws(getInstitutionLoginUrl, /public HTTPS/);
  }
});

test("rejects invalid and non-web portal URLs", () => {
  for (const url of ["invalid url", "javascript:alert(1)"]) {
    process.env.INSTITUTION_PORTAL_URL = url;
    assert.throws(getInstitutionLoginUrl, /valid URL|HTTP or HTTPS/);
  }
});
