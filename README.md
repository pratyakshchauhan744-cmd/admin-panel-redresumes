# RedResumes admin panel

## Institution onboarding email configuration

Set these variables in the production hosting environment, then redeploy or restart the application. A local `.env` file does not configure the deployed server.

```dotenv
RESEND_API_KEY=re_your_actual_resend_api_key
EMAIL_FROM="RedResumes <onboarding@your-verified-domain.com>"
INSTITUTION_PORTAL_URL=https://your-institution-portal.com/login?portal=enterprise
```

- Create a valid API key in the same Resend account/team as your verified sending domain. If the key is restricted to a domain, it must allow the domain used in `EMAIL_FROM`.
- Add your own sending domain to [Resend Domains](https://resend.com/domains), publish the DNS records Resend supplies, and wait for verification. Use an address on that exact domain in `EMAIL_FROM`. A personal Gmail address cannot be used as your verified sender.
- The shared `onboarding@resend.dev` sender supports testing with your Resend account email; use your verified domain to email institutions. See [Resend's sender restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
- `INSTITUTION_PORTAL_URL` is the full login URL for the institution-facing app. This admin panel's login only admits internal staff. If this variable is omitted, the email uses `/login?portal=enterprise` on `NEXT_PUBLIC_APP_URL`. Production requires a public HTTPS URL.

Onboarding emails go to both the Main Faculty Administrator and the Official / Placement email when supplied. Duplicate addresses receive one copy. The Main Faculty email is the account's login ID in both copies.

The account is created before the email is submitted. If Resend rejects the request, the admin page shows the reason and the temporary credentials for secure manual sharing. The college already exists, so do not onboard it again. Passwords are not written to server logs.

A successful API response means Resend accepted the email, not that it reached the inbox. Use the email ID in the `[INSTITUTION EMAIL ACCEPTED]` server log to inspect delivery/bounces in [Resend Emails](https://resend.com/emails). See [Resend API errors](https://resend.com/docs/api-reference/errors) for rejected requests.

Run `npm test` for mocked email regression checks and `npm run build` to validate the production build.
