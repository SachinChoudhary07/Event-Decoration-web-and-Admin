# Deploying Celebration Decor (free, Netlify)

Everything runs on one free Netlify account: the website, the admin, the data and uploaded photos (Netlify Blobs). No card, no database service, nothing else to sign up for.

## New client, in 10 minutes

1. Client creates a free account at https://app.netlify.com (their own email, so the site is theirs).
2. On your computer, in this folder:
   ```
   pnpm install
   npx netlify-cli login                 # log in as the client
   npx netlify-cli sites:create --name <client-name>
   pnpm hash-password "<client's admin password>"
   ```
3. Add the variables (Netlify → Project configuration → Environment variables):
   - `ADMIN_EMAIL` — the client's login email
   - `ADMIN_PASSWORD_HASH` — from step 2
   - `SESSION_SECRET` — from step 2
   - `SITE_URL` — only if they use a custom domain, e.g. `https://theirshop.in`
4. Deploy: `npx netlify-cli deploy --build --prod`
5. Client opens `https://<client-name>.netlify.app/admin`, signs in, and fills in Settings (name, WhatsApp, address), categories and designs. The sample catalogue disappears as soon as they save their own content.

**Windows:** if the deploy fails with "Failed publishing static content", the editor is holding files in `.next`. Copy the project to a folder that isn't open in the editor (without `node_modules`, `.next`, `.env.local`), run `pnpm install` there, and deploy from that folder.

**Change the admin password:** run `pnpm hash-password` again, replace `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` in Netlify, then redeploy.

## Free plan limits (Netlify Free: 300 credits/month)

- Every production deploy costs about 15 credits, and every GB of traffic about 20. A small decoration business typically uses a fraction of this.
- If the limit is reached, Netlify **pauses the sites on that account** until next month (it never charges). One account per client keeps one client's traffic from affecting another.
- Uploads are capped at 4.5 MB per file. Photos are compressed automatically before upload. For long videos, upload to YouTube or Instagram and link to them.

## Local development

```
pnpm hash-password "pick-a-password"   # paste the output into .env.local with ADMIN_EMAIL=...
pnpm dev                               # http://localhost:5173, data saved in .data/
```
