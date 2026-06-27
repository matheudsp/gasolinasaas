#!/bin/bash

# Setup Cloudflare Workers Secrets
# This script helps you set up production secrets using wrangler

set -e

echo "🔐 Cloudflare Workers Secrets Setup"
echo "===================================="
echo ""
echo "This script will help you set production secrets for your Worker."
echo "Priority order:"
echo "  1. Read from .prod.vars (recommended for production)"
echo "  2. Read from .dev.vars (fallback)"
echo "  3. Enter values manually (interactive)"
echo ""

# Change to the server directory
cd "$(dirname "$0")/.."

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed or not in PATH"
    echo "   Run: npm install -g wrangler"
    exit 1
fi

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if [ -z "$secret_value" ]; then
        echo "⏭️  Skipping $secret_name (empty value)"
        return
    fi
    
    echo "📝 Setting $secret_name..."
    echo "$secret_value" | wrangler secret put "$secret_name"
    echo "✅ $secret_name set successfully"
    echo ""
}

# Determine which file to use
vars_file=""

if [ -f ".prod.vars" ]; then
    read -p "Read secrets from .prod.vars file? (y/n): " use_prod_vars
    if [ "$use_prod_vars" = "y" ] || [ "$use_prod_vars" = "Y" ]; then
        vars_file=".prod.vars"
    fi
elif [ -f ".dev.vars" ]; then
    echo "⚠️  No .prod.vars found. You can create one from .prod.vars.example"
    read -p "Read secrets from .dev.vars instead? (y/n): " use_dev_vars
    if [ "$use_dev_vars" = "y" ] || [ "$use_dev_vars" = "Y" ]; then
        vars_file=".dev.vars"
    fi
fi

if [ -n "$vars_file" ]; then
    # Read from vars file
    echo ""
    echo "📖 Reading secrets from $vars_file..."
    echo ""
    
    # Source the vars file
    export $(grep -v '^#' "$vars_file" | xargs)
    
    # Set each secret
    set_secret "DATABASE_URL" "$DATABASE_URL"
    set_secret "DATABASE_URL_POOLER" "$DATABASE_URL_POOLER"
    set_secret "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET"
    set_secret "GITHUB_CLIENT_SECRET" "$GITHUB_CLIENT_SECRET"
    set_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
    
else
    # Manual input
    echo ""
    echo "📝 Enter secrets manually (press Enter to skip):"
    echo ""
    
    read -p "DATABASE_URL: " DATABASE_URL
    set_secret "DATABASE_URL" "$DATABASE_URL"
    
    read -p "DATABASE_URL_POOLER: " DATABASE_URL_POOLER
    set_secret "DATABASE_URL_POOLER" "$DATABASE_URL_POOLER"
    
    read -p "BETTER_AUTH_SECRET: " BETTER_AUTH_SECRET
    set_secret "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET"
    
    read -p "GITHUB_CLIENT_SECRET: " GITHUB_CLIENT_SECRET
    set_secret "GITHUB_CLIENT_SECRET" "$GITHUB_CLIENT_SECRET"
    
    read -p "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
    set_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
fi

echo ""
echo "✨ All secrets have been set successfully!"
echo ""
echo "Next steps:"
echo "  1. Add non-sensitive public IDs to wrangler.jsonc vars:"
echo "     - GITHUB_CLIENT_ID"
echo "     - GOOGLE_CLIENT_ID"
echo "  2. Deploy your worker: pnpm run deploy"
echo ""
