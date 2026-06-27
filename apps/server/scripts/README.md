# Server Scripts

## 🔐 Setup Secrets (`setup-secrets.mjs`)

Automate the setup of sensitive information (secrets) for Cloudflare Workers production environment.

### Usage

```bash
# Run from the server directory
cd apps/server
pnpm run secrets:setup

# Or run the script directly
node scripts/setup-secrets.mjs

# Or use the Bash script (Unix/Linux/macOS)
./scripts/setup-secrets.sh
```

### Features

1. **Three input methods** (by priority):
   - Automatically read from `.prod.vars` file (**recommended for production**)
   - Automatically read from `.dev.vars` file (fallback when `.prod.vars` is not available)
   - Manually enter each secret

2. **Secrets to be set**:
   - `DATABASE_URL` - Database connection URL
   - `DATABASE_URL_POOLER` - Database connection pool URL
   - `BETTER_AUTH_SECRET` - Better Auth secret key
   - `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

3. **Security**:
   - All secrets are encrypted and stored via `wrangler secret put`
   - Not visible in plain text in the Dashboard
   - Not committed to Git repository

### Examples

#### Method 1: Read from .prod.vars (Recommended for Production)

```bash
$ pnpm run secrets:setup

🔐 Cloudflare Workers Secrets Setup
====================================

Read secrets from .prod.vars file? (y/n): y

📖 Reading secrets from .prod.vars...

📝 Setting DATABASE_URL...
✅ DATABASE_URL set successfully

📝 Setting DATABASE_URL_POOLER...
✅ DATABASE_URL_POOLER set successfully

✨ All secrets have been set successfully!
```

#### Method 2: Read from .dev.vars (Fallback)

```bash
$ pnpm run secrets:setup

⚠️  No .prod.vars found. You can create one from .prod.vars.example
Read secrets from .dev.vars instead? (y/n): y

📖 Reading secrets from .dev.vars...
...
```

#### Method 3: Manual Input

```bash
$ pnpm run secrets:setup

Read secrets from .dev.vars file? (y/n): n

📝 Enter secrets manually (press Enter to skip):

DATABASE_URL: postgresql://user:pass@host/db
📝 Setting DATABASE_URL...
✅ DATABASE_URL set successfully

BETTER_AUTH_SECRET: your-secret-key
📝 Setting BETTER_AUTH_SECRET...
✅ BETTER_AUTH_SECRET set successfully

...
```

### Complete Deployment Workflow

```bash
# 1. Create .prod.vars file for production sensitive information
cp .prod.vars.example .prod.vars
# Edit .prod.vars and fill in production values

# 2. Run secrets setup script
pnpm run secrets:setup
# Choose "y" to read from .prod.vars

# 3. Add non-sensitive public IDs to wrangler.jsonc
# Edit wrangler.jsonc and add:
{
  "vars": {
    "GITHUB_CLIENT_ID": "your_github_client_id",
    "GOOGLE_CLIENT_ID": "your_google_client_id"
  }
}

# 4. Deploy to production
pnpm run deploy
```

### File Descriptions

- **`.dev.vars`** - Local development environment configuration (automatically read by `wrangler dev`)
- **`.prod.vars`** - Production secrets configuration (read by `secrets:setup` script)
- **`.prod.vars.example`** - Production configuration template
- **`.dev.vars.example`** - Development configuration template

### Verify Secrets

After deployment, you can view them in Cloudflare Dashboard:

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → Select your Worker
3. Settings → Variables and Secrets
4. In the "Secrets" section, you can see the set secrets (but not their values)

### Update Secret

If you need to update a secret:

```bash
# Method 1: Use script (reset all secrets)
pnpm run secrets:setup

# Method 2: Update a single secret
echo "new-secret-value" | wrangler secret put SECRET_NAME
```

### Delete Secret

```bash
wrangler secret delete SECRET_NAME
```

### FAQ

**Q: Why use secrets instead of vars?**  
A: `vars` are visible in plain text in the Dashboard, while `secrets` are encrypted storage, suitable for sensitive information.

**Q: Can I use secrets in local development?**  
A: Not necessary. Using `.dev.vars` file is more convenient for local development.

**Q: Do I need to redeploy after setting secrets?**  
A: No, secrets take effect immediately after update.

**Q: How to view which secrets are currently set?**  
A: Run `wrangler secret list`

---

## Other Scripts

### `sync-wrangler-secrets.js`

Synchronize environment variables to Cloudflare Workers (legacy version, `setup-secrets.mjs` is recommended).

### `deploy-all.mjs`

Deploy all applications (in root directory).
