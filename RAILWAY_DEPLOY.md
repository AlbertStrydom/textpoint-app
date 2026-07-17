# Railway Deployment Guide

## Prerequisites
- [Railway account](https://railway.app) (free tier — \$5 credit, no card required to start)
- Git repo with this code pushed (GitHub, GitLab, or direct upload)

## Step 1 — Create a Railway Project

1. Go to https://railway.app/dashboard
2. Click **New Project** → **Deploy from GitHub repo** (or **Blank Project** and add services manually)
3. Select your repository

## Step 2 — Add a MySQL Database

1. Inside your Railway project, click **New** → **Database** → **Add MySQL**
2. Wait for it to provision (a few seconds)
3. Click the MySQL service → **Connect** tab → copy the `DATABASE_URL` (e.g. `mysql://root:random@host:3306/railway`)

## Step 3 — Configure Environment Variables

Add these to your app service's **Variables** tab:

| Variable | Value | Notes |
|----------|-------|-------|
| `BETTER_AUTH_SECRET` | Run `openssl rand -hex 32` locally — at least 32 hex chars | Required |
| `APP_BASE_URL` | `https://textpoint.up.railway.app` | Replace with your actual Railway domain |
| `DATABASE_URL` | Paste the MySQL connection string from Step 2 | Required |
| `LOCAL_AUTH_BYPASS` | `false` | Keep disabled in production |
| `BOOTSTRAP_ADMIN_EMAIL` | `you@example.com` | Optional — creates first admin on startup |
| `BOOTSTRAP_ADMIN_NAME` | `Your Name` | Optional |
| `BOOTSTRAP_ADMIN_PASSWORD` | A strong password | Optional |
| `STORAGE_PROVIDER` | `local` (default) or `s3` | Local works on Railway free tier |

## Step 4 — Deploy

Railway auto-deploys on every push to the connected branch. To trigger manually:

```bash
git push main
```

Or click **Deploy** on the Railway dashboard.

## Step 5 — Verify

1. Open the Railway-generated URL (e.g. `https://textpoint.up.railway.app`)
2. Log in using the bootstrapped admin credentials (if you set `BOOTSTRAP_ADMIN_*` vars)

## Notes

- **Free tier limits**: Railway provides \$5/month free credit. MySQL + web app together cost ~\$3-4/month, so it fits the free tier.
- **Idle sleeping**: On free tier, the app may sleep after inactivity. First request after idle takes ~10-15s to wake.
- **Storage**: Local file uploads are stored in Railway's ephemeral filesystem and will be lost on restart. For persistent uploads, add `STORAGE_PROVIDER=s3` with a compatible S3 bucket (Backblaze B2, Cloudflare R2, etc.).

## Rollback

If something goes wrong:

1. **Revert code**: `git revert HEAD` and push — Railway auto-deploys the previous state
2. **Database**: Railway MySQL has automated backups — restore from the **Backups** tab
3. **Environment**: Unset or correct any bad env vars in the **Variables** tab, then ** Redeploy**
