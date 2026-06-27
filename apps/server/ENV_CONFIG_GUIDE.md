# Environment Variables Configuration Guide

This project uses multiple configuration files to manage variables for different environments.

## 📁 Configuration Files

### Development Environment

| File | Purpose | Usage | Commit to Git |
|------|---------|-------|---------------|
| `.dev.vars.example` | Development variables template | Copy to `.dev.vars` | ✅ Yes |
| `.dev.vars` | Development variables (actual values) | Automatically read by `wrangler dev` | ❌ No |

### Production Environment

| File | Purpose | Usage | Commit to Git |
|------|---------|-------|---------------|
| `.prod.vars.example` | Production variables template | Copy to `.prod.vars` | ✅ Yes |
| `.prod.vars` | Production sensitive information (actual values) | Read by `pnpm run secrets:setup` | ❌ No |
| `wrangler.jsonc` | Production public variables | Used by `wrangler deploy` | ✅ Yes |

## 🔄 Workflow

### Local Development

```bash
# 1. Create development environment configuration
cp .dev.vars.example .dev.vars

# 2. Edit .dev.vars and fill in actual values for local development
# e.g., local database connection, test OAuth keys, etc.

# 3. Start development server (automatically reads .dev.vars)
pnpm run dev
```

### Production Deployment

```bash
# 1. Create production environment configuration
cp .prod.vars.example .prod.vars

# 2. Edit .prod.vars and fill in actual production values
# e.g., production database, official OAuth keys, API secrets, etc.

# 3. Run script to set sensitive information as Cloudflare secrets
pnpm run secrets:setup
# Choose "y" to read from .prod.vars

# 4. Add non-sensitive public variables to wrangler.jsonc
# e.g., GITHUB_CLIENT_ID, GOOGLE_CLIENT_ID, etc.

# 5. Deploy
pnpm run deploy
```

## 🔐 Security Best Practices

### ✅ Do's

- ✅ Set all sensitive information (passwords, secrets, tokens) as Cloudflare Secrets
- ✅ Only put non-sensitive public variables in `wrangler.jsonc`
- ✅ Commit `.example` template files to Git
- ✅ Use `.prod.vars` to separate production and development configurations
- ✅ Regularly rotate production secrets

### ❌ Don'ts

- ❌ Don't commit `.dev.vars` or `.prod.vars` to Git
- ❌ Don't store sensitive information in `vars` of `wrangler.jsonc`
- ❌ Don't use development configuration in production environment
- ❌ Don't hardcode any sensitive information in code

## 📊 Variable Priority

### Development Environment (`wrangler dev`)
```
.dev.vars > wrangler.jsonc vars
```

### Production Environment (`wrangler deploy`)
```
Cloudflare Secrets > wrangler.jsonc vars
```

## 🛠️ Common Commands

```bash
# Set production secrets
pnpm run secrets:setup

# List current secrets
wrangler secret list

# Update a single secret
echo "new-value" | wrangler secret put SECRET_NAME

# Delete a secret
wrangler secret delete SECRET_NAME

# View current configuration (without showing secret values)
wrangler deploy --dry-run
```

## 🔍 Variable Type Classification

### Secrets (Sensitive Information)
Set via `wrangler secret put`, encrypted storage:
- `DATABASE_URL`
- `DATABASE_URL_POOLER`
- `BETTER_AUTH_SECRET`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_SECRET`

### Vars (Public Variables)
Configured in `wrangler.jsonc`, visible in plain text:
- `NODE_ENV`
- `CORS_ORIGIN`
- `BETTER_AUTH_URL`
- `GITHUB_CLIENT_ID`
- `GOOGLE_CLIENT_ID`

## 📚 Related Documentation

- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Project Scripts Documentation](./scripts/README.md)

## ❓ FAQ

**Q: Why separate .dev.vars and .prod.vars?**  
A: Development and production environments require different configurations (such as different databases, OAuth callback URLs, etc.). Separate management is safer and clearer.

**Q: Do I need to re-run secrets:setup after modifying .prod.vars?**  
A: Yes, `.prod.vars` is just a local file. You need to push it to Cloudflare through the `secrets:setup` script.

**Q: How to switch between multiple environments (staging/production)?**  
A: You can use wrangler's environment configuration feature by defining multiple `env` blocks in `wrangler.jsonc`.

**Q: What if I forget the value of a secret?**  
A: Cloudflare doesn't allow reading secret values (you can only reset them). It's recommended to backup `.prod.vars` in a secure local location.
