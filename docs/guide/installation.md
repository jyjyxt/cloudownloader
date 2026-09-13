# Installation

## Requirements

- **Node.js**: >= 20.18.1, or **Bun** >= 1.0
- **Chrome** running and logged into the target site (for browser commands)

## Install from Source

```bash
git clone https://github.com/jyjyxt/cloudownloader.git
cd cloudownloader
npm install
npm run build
npm link      # Link binary globally
cloudl list  # Now you can use it anywhere!
```

## Update

```bash
cd /path/to/cloudownloader
git pull --ff-only
npm install
npm link

# If you use the packaged Cloudl skills, refresh them too
npx skills add jyjyxt/cloudownloader
```

Or refresh only the skills you actually use:

```bash
npx skills add jyjyxt/cloudownloader --skill cloudl-adapter-author
npx skills add jyjyxt/cloudownloader --skill cloudl-autofix
npx skills add jyjyxt/cloudownloader --skill cloudl-browser
npx skills add jyjyxt/cloudownloader --skill cloudl-browser-sitemap
npx skills add jyjyxt/cloudownloader --skill cloudl-sitemap-author
npx skills add jyjyxt/cloudownloader --skill cloudl-usage
npx skills add jyjyxt/cloudownloader --skill smart-search
```

## Verify Installation

```bash
cloudl --version   # Check version
cloudl list        # List all commands
cloudl doctor      # Diagnose connectivity
```
