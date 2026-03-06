# CI/CD with GitHub Actions + Vercel (First-Time Guide)

This guide explains how to:

1. Push your project to GitHub
2. Configure Vercel for hosting
3. Add required secrets to GitHub
4. Let GitHub Actions run checks and deploy automatically

The workflow file is already added at:

- `.github/workflows/ci-cd-vercel.yml`

---

## 1) What this pipeline does

When you open a Pull Request to `main`:

- Runs `npm ci`
- Runs `npm run lint`
- Runs `npm run build`

When code is pushed to `main`:

- Runs all checks above
- Deploys to Vercel production automatically

If checks fail, deployment is blocked.

---

## 2) One-time GitHub setup

If your code is not on GitHub yet, run these commands from project root:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

Command explanations:

- `git init`: Creates a local Git repository.
- `git add .`: Stages all current files.
- `git commit -m "..."`: Saves a snapshot of staged files.
- `git branch -M main`: Renames current branch to `main`.
- `git remote add origin ...`: Connects local repo to GitHub repo URL.
- `git push -u origin main`: Uploads code and sets upstream tracking.

---

## 3) One-time Vercel setup

Install Vercel CLI globally:

```powershell
npm install -g vercel
```

Login to Vercel:

```powershell
vercel login
```

Link this local project to a Vercel project (run inside repo):

```powershell
vercel link
```

During prompts:

- Choose your Vercel scope/team
- Select existing project or create a new one
- Confirm project root (`.`)

What these commands do:

- `npm install -g vercel`: Installs Vercel command-line tool.
- `vercel login`: Authenticates your account.
- `vercel link`: Binds local folder to a Vercel project and generates `.vercel` metadata locally.

---

## 4) Get required Vercel values for GitHub secrets

After linking, open:

- `.vercel/project.json`

You will find:

- `projectId`
- `orgId`

Now create a Vercel token:

1. Go to Vercel Dashboard
2. `Settings` -> `Tokens`
3. Create a new token
4. Copy it safely

You now have these 3 Vercel secrets to add to GitHub:

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

---

## 5) Add all secrets in GitHub

In GitHub repo:

1. Open `Settings` -> `Secrets and variables` -> `Actions`
2. Click `New repository secret`
3. Add these secrets:

- `VERCEL_TOKEN` = token from Vercel settings
- `VERCEL_PROJECT_ID` = projectId from `.vercel/project.json`
- `VERCEL_ORG_ID` = orgId from `.vercel/project.json`
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

Why Supabase secrets are needed:

- Your app build reads Vite environment variables.
- CI build on GitHub also needs those values for successful build checks.

---

## 6) Commit and push the workflow

```powershell
git add .github/workflows/ci-cd-vercel.yml docs/github-actions-vercel-deploy.md
git commit -m "Add GitHub Actions CI/CD for Vercel deployment"
git push
```

What happens after push:

- GitHub automatically starts the workflow.
- `ci` job runs lint + build.
- If successful and branch is `main`, `deploy` job publishes to Vercel production.

---

## 7) Verify pipeline status

In GitHub:

1. Open repo
2. Go to `Actions` tab
3. Open latest run
4. Confirm both jobs are green:
   - `Lint and Build`
   - `Deploy to Vercel (Production)`

In Vercel:

1. Open project dashboard
2. Check latest deployment is `Ready`
3. Open production URL

---

## 8) Typical daily workflow after setup

```powershell
git checkout -b feature/some-change
# make changes
git add .
git commit -m "Implement some change"
git push -u origin feature/some-change
```

Then open PR to `main`:

- GitHub Actions runs CI checks.
- Merge only if checks pass.
- On merge/push to `main`, deployment happens automatically.

---

## 9) Troubleshooting quick fixes

- `Missing VERCEL_TOKEN` error:
  Add `VERCEL_TOKEN` secret in GitHub Actions secrets.

- Build fails with missing `VITE_*` variable:
  Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in GitHub secrets.

- Deployment runs on wrong branch:
  Confirm you are pushing to `main`; workflow is configured for `main` only.

- Vercel project mismatch:
  Re-run `vercel link` locally and update `VERCEL_PROJECT_ID` and `VERCEL_ORG_ID` secrets.
