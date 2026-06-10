# Cheatsheet — sast-pipeline-demo

> Git Bash only — never use PowerShell or CMD for this project.

---

## Part 1 — One-Time Machine Setup

| Tool | Status |
|---|---|
| Node.js | ✅ Installed |
| Git | ✅ Installed |
| Python 3.12.4 | ✅ Installed |
| Gitleaks 8.30.1 | ✅ Copied to `C:\_WorkingFolder\GITHUB_PROJECTS_AVI\sast-tools\` — add to PATH |
| Semgrep 1.164.0 | ✅ Installed via pip |
| Docker Desktop 29.5.2 | ✅ Installed |
| SonarQube | ✅ Running via Docker on port 9000 |
| Codacy | ✅ Cloud connected — `patyalav/sast-juice-shop` |

### Gitleaks PATH Setup
1. Copy `gitleaks.exe` to `C:\_WorkingFolder\GITHUB_PROJECTS_AVI\sast-tools\`
2. Open Windows Search → "Environment Variables" → Edit System Variables → Path → New
3. Add: `C:\_WorkingFolder\GITHUB_PROJECTS_AVI\sast-tools`
4. Restart Git Bash
5. Verify: `gitleaks version`

---

## Part 2 — Per-Project Setup Steps (Chronological)

### Step 1 — Navigate to project folder
```bash
cd /c/_WorkingFolder/GITHUB_PROJECTS_AVI/sast-pipeline-demo
```
- Git Bash uses forward slashes and `/c/` instead of `C:\`

### Step 2 — Create subfolders
```bash
mkdir agents utils reports public docs
```
- `agents/` — one JS file per SAST tool
- `utils/` — helper modules
- `reports/` — JSON output per scan run (timestamped)
- `public/` — frontend HTML pages
- `docs/` — ProjectMemory and Cheatsheet

### Step 3 — Create all blank files
```bash
touch server.js orchestrator.js statusManager.js logger.js config.js \
  .env .env.example .gitignore \
  agents/gitleaks.js agents/semgrep.js agents/sonarqube.js agents/codacy.js \
  utils/validator.js utils/cleanup.js utils/reportCombiner.js \
  public/index.html public/progress.html public/dashboard.html \
  docs/ProjectMemory.md docs/Cheatsheet.md
```
- `touch` creates empty files — no content yet

### Step 4 — Verify structure
```bash
find . -not -path './node_modules/*' | sort
```
- Lists all files/folders excluding node_modules

### Step 5 — Initialise package.json
```bash
npm init -y
```
- Creates `package.json` with default values
- `-y` skips all prompts

### Step 6 — Install dependencies
```bash
npm install express axios dotenv winston
```
- `express` — web framework for the API server
- `axios` — HTTP client (used by SonarQube + Codacy agents)
- `dotenv` — loads `.env` variables into `process.env`
- `winston` — centralised logger

### Step 7 — Verify dependencies installed
```bash
cat package.json
```
- Confirm all 4 packages appear under `"dependencies"`

### Step 8 — Fix package.json main entry point
```bash
npm pkg set main="server.js"
```
- Sets the correct entry point — default was wrong after `npm init -y`

### Step 9 — Initialise Git repository
```bash
git init
git status
```
- `git init` — creates local Git repo (run once only)
- `git status` — confirm `.env` is NOT listed (gitignore working)

### Step 10 — First GitHub commit and push
```bash
git add .
git commit -m "Initial scaffold — folder structure, logger, package.json, env setup"
git branch -M main
git remote add origin https://github.com/patyalav/sast-pipeline-demo.git
git push -u origin main
```
- `git add .` — stages all untracked files
- `git commit -m` — saves snapshot with descriptive message
- `git branch -M main` — renames branch from master to main
- `git remote add origin` — links local repo to GitHub
- `git push -u origin main` — pushes to GitHub, sets default upstream

### Step 11 — Start SonarQube Docker container
```bash
docker ps
docker run -d -p 9000:9000 sonarqube:community
```
- `docker ps` — lists running containers
- `docker run -d` — runs container in background (detached)
- `-p 9000:9000` — maps container port 9000 to local port 9000
- SonarQube UI available at `http://localhost:9000` after ~2 minutes

### Step 12 — Smoke test any module
```bash
node -e "const m = require('./path/to/module'); ..."
```
- Runs inline Node.js code to test a module without creating a test file
- Always test each module immediately after building it

---

## Part 3 — Command Reference

| Command | What it does |
|---|---|
| `pwd` | Print current directory path |
| `ls` | List files in current directory |
| `mkdir <name>` | Create a folder |
| `touch <file>` | Create a blank file |
| `cd /c/path/to/folder` | Navigate to a folder (Git Bash format) |
| `mv <src> <dest>` | Move or rename a file/folder |
| `find . -not -path './node_modules/*' \| sort` | List all project files excluding node_modules |
| `cat <file>` | Print file contents to terminal |
| `npm init -y` | Initialise package.json with defaults |
| `npm pkg set main="server.js"` | Set entry point in package.json |
| `git init` | Initialise local Git repository (once only) |
| `git add .` | Stage all changes for commit |
| `git commit -m "message"` | Save snapshot with descriptive message |
| `git branch -M main` | Rename branch to main |
| `git remote add origin <url>` | Link local repo to GitHub remote |
| `git push -u origin main` | Push to GitHub and set default upstream |
| `git push` | Push subsequent commits (after -u is set) |
| `git status` | Show staged/unstaged/untracked files |
| `docker ps` | List running Docker containers |
| `docker run -d -p 9000:9000 sonarqube:community` | Start SonarQube container |

---

## Part 4 — Concepts

### npm init
Creates `package.json` — the project's configuration file. Tracks project name, version, entry point, and all dependencies. Anyone who clones the repo runs `npm install` to recreate `node_modules/` from this file.

### package.json vs package-lock.json
- `package.json` — what you declared (e.g. `express ^4.18.0`)
- `package-lock.json` — exact versions actually installed — ensures everyone gets identical versions

### dotenv
Loads variables from `.env` file into `process.env` at runtime.
```javascript
require('dotenv').config();
console.log(process.env.PORT); // reads from .env
```
Never commit `.env` — it contains secrets. Always commit `.env.example` with variable names but no values.

### Winston Logger Levels
| Level | When to use |
|---|---|
| `DEBUG` | Full data dumps — only when `DEBUG_MODE=true` |
| `INFO` | Normal flow — step started, completed, counts |
| `WARN` | Non-fatal issues — skipped items, retries |
| `ERROR` | Failures that stop or affect execution |

### Git Bash Path Format
| Windows | Git Bash |
|---|---|
| `C:\Users\Avi\project` | `/c/Users/Avi/project` |
| `D:\Work\code` | `/d/Work/code` |

### Why No Severity Normalisation Across Tools
Each SAST tool uses its own severity scale. Mapping them to a unified scale (e.g. SonarQube CRITICAL → High) is misleading because:
- Tools measure different things — secrets vs code quality vs vulnerabilities
- Severity thresholds differ per tool — a Semgrep ERROR ≠ SonarQube CRITICAL
- Stakeholders familiar with a tool will question the mapping
- Cross-tool averages hide important per-tool signals

**Decision:** Show each tool's findings with its own native severity labels. See `docs/NormalisationRisks.md` for full explanation.

### pipeline-report.json Structure
One file, four tool keys — findings never mixed:
```json
{
  "generatedAt": "...",
  "totalFindings": 1383,
  "tools": {
    "gitleaks":  { "status": "done", "findingCount": 135, "severityBreakdown": {...}, "findings": [...] },
    "semgrep":   { "status": "done", "findingCount": 22,  "severityBreakdown": {...}, "findings": [...] },
    "sonarqube": { "status": "done", "findingCount": 98,  "severityBreakdown": {...}, "findings": [...] },
    "codacy":    { "status": "done", "findingCount": 1091,"severityBreakdown": {...}, "findings": [...] }
  }
}
```

### statusManager — Tool States
| State | Meaning |
|---|---|
| `pending` | Tool not started yet |
| `running` | Tool currently executing |
| `done` | Tool completed — findings available |
| `failed` | Tool errored — partial report still generated |

### Docker Concepts
- **Container** — isolated environment running SonarQube
- **`-d`** — detached mode — runs in background, terminal is free
- **`-p 9000:9000`** — port mapping: `host:container`
- **Docker Desktop must be running** for any `docker` command to work

### Server Stays Running — Always Use Two Terminals
When you run `node server.js` the cursor appears stuck — this is normal. The server is live and listening. **Never close this terminal during a scan.**
- Terminal 1 — always reserved for `node server.js`
- Terminal 2 — use for all curl tests, git commands, and file operations

### README.md
Lives in the project root — always committed to GitHub. First thing anyone sees when cloning. Contains:
- What the project does
- Full prerequisites list with download links
- Step-by-step installation guide
- Environment variables reference
- Demo Day startup checklist

### Semgrep — Excluding Files via .semgrepignore
Create `.semgrepignore` in the root of the repo being scanned:
```
# Exclude secrets files — covered by Gitleaks
config/secrets.cfg
secrets/
```
Note: Only works when `--no-git-ignore` flag is NOT passed to Semgrep CLI.

### Git — Untrack a File Already Committed
When you want Git to stop tracking a file but keep it on disk:
```bash
git rm --cached filename
```
When you want Git to stop tracking AND delete the file:
```bash
git rm filename
```

### git rm vs rm
| Command | What it does |
|---|---|
| `rm filename` | Deletes file from disk only — Git still tracks it |
| `git rm filename` | Deletes file from disk AND untracks from Git |
| `git rm --cached filename` | Untracks from Git but keeps file on disk |

### Sequential vs Parallel Execution
`orchestrator.js` runs tools sequentially with 5s delay between each:
```javascript
await gitleaks.run(repoPath, reportsDir);
await delay(5000);
await semgrep.run(repoPath, reportsDir);
```
To change delay — update the `delay(5000)` calls in `orchestrator.js` (3 occurrences).

### Scan Categories shown on UI
Tool names are hidden — UI shows scan categories instead:
| Tool | Category shown |
|---|---|
| Gitleaks | 🔑 Secret Detection |
| Semgrep | 🛡️ OWASP Vulnerability Analysis |
| SonarQube | 📊 Code Quality & Security Hotspots |
| Codacy | 📉 Technical Debt |

### SonarQube + Codacy — Why Stubs
- SonarQube needs project pre-provisioned before scanning — dynamic creation is extra engineering
- Codacy has no API to add repos — must be connected manually via website
- Both use stub data with `demo_` filename prefix so findings are clearly illustrative

---

## Part 5 — Tool Reference Guide

> Use this section during demos and Q&A. Plain English explanations of all 4 tools.

---

### What is OWASP?

OWASP stands for **Open Web Application Security Project** — a non-profit that publishes globally recognised standards for web application security. Their most famous publication is the **OWASP Top 10** — the 10 most critical web security risks updated every few years based on real-world data.

Think of OWASP as the WHO of web security — they define the standards, not the tools.

**OWASP Top 10 (2021):**

| # | Risk | Simple Example |
|---|---|---|
| A01 | Broken Access Control | User accessing another user's data |
| A02 | Cryptographic Failures | Passwords stored in plain text |
| A03 | Injection | SQL Injection, XSS, eval() |
| A04 | Insecure Design | No rate limiting on login |
| A05 | Security Misconfiguration | Debug mode on in production |
| A06 | Vulnerable Components | Using outdated libraries |
| A07 | Auth Failures | Weak JWT secrets |
| A08 | Software Integrity Failures | Using unverified/non-existent packages |
| A09 | Logging Failures | No audit trail for security events |
| A10 | Server-Side Request Forgery | App fetching attacker-controlled URLs |

---

### 🔑 Gitleaks

**What it is:** A CLI tool that scans source code for hardcoded secrets — API keys, tokens, passwords, and credentials that should never appear in code.

**How it works:** Pattern matching against hundreds of known secret formats — AWS keys, JWT tokens, Stripe keys, Slack webhooks, and more.

**What it catches:**
- Hardcoded API keys and tokens
- Database passwords in config files
- JWT signing secrets
- Cloud provider credentials (AWS, GCP, Azure)
- Payment gateway keys (Stripe, PayPal)
- Communication service keys (Twilio, Mailgun, Slack)

**OWASP mapping:** A02 (Cryptographic Failures), A07 (Auth Failures)

**Native severity:** All findings are `Secret` — Gitleaks treats every exposed secret as equally serious regardless of type.

**Simple explanation for demo:**
> *"Gitleaks scans every file looking for anything that looks like a real credential. If a developer accidentally commits an API key — Gitleaks finds it immediately."*

---

### 🛡️ Semgrep

**What it is:** A fast, rule-based static analysis engine that finds known vulnerability patterns in code by analysing how data flows through the application.

**How it works:** Matches code patterns against thousands of community and custom rules — from simple pattern matching to complex data flow analysis (taint tracking).

**What it catches:**
- SQL Injection — user input in SQL queries
- XSS — user input rendered in HTML responses
- eval() injection — user data flowing into eval()
- Path traversal — user input in file paths
- Weak cryptography — MD5, DES, Math.random()
- Hardcoded secrets — API keys in code
- AI Hallucinations — imports of non-existent or suspicious packages

**OWASP mapping:** A01, A02, A03, A07, A08

**Native severity:** ERROR (confirmed vulnerability), WARNING (potential risk), INFO (advisory)

**Key difference from SonarQube:**
> *"Semgrep is a specialist — it looks for specific known attack patterns very precisely. High confidence, low noise."*

---

### 📊 SonarQube

**What it is:** A comprehensive code analysis platform that covers security vulnerabilities, code quality bugs, and security hotspots across 40+ languages.

**How it works:** Deep static analysis — tracks data flow, detects anti-patterns, and flags code that needs human security review (hotspots).

**What it catches:**

| Category | Examples |
|---|---|
| Security Vulnerabilities | Hardcoded passwords, SQL injection, insecure SSL |
| Security Hotspots | Code needing human review — crypto usage, auth logic, CORS |
| Bugs | Null pointer risks, wrong operators, unreachable code, resource leaks |
| Code Smells | High complexity, duplicate code, unused variables |

**OWASP mapping:** A02, A03, A04, A05, A09

**Native severity:** BLOCKER, CRITICAL, MAJOR, MINOR, INFO

**Key difference from Semgrep:**
> *"SonarQube is a generalist — deeper analysis covering security, quality, and maintainability together. Some findings are confirmed issues, others are hotspots that need a developer to review and decide."*

**What are Security Hotspots?**
> *"Not every hotspot is a vulnerability — it's code that's sensitive enough to deserve a second look. For example, any use of cryptography functions — even correct ones — gets flagged so a developer confirms it's implemented safely."*

**What are Bugs (in SonarQube context)?**
Coding mistakes that cause incorrect behaviour at runtime — not security issues. Examples:
- `if (x = 5)` instead of `if (x === 5)` — assignment instead of comparison
- Code after a `return` statement — never executes
- Opening a file but never closing it — memory leak

---

### 📉 Codacy

**What it is:** A cloud-based code quality platform focused on maintainability, best practices, and technical debt — especially useful for tracking quality trends over time.

**How it works:** Runs multiple linting and analysis engines against the codebase and aggregates results into a quality score with trend tracking.

**What it catches:**
- High cognitive complexity — functions too complex to review safely
- Empty catch blocks — errors silently swallowed
- Unused variables — dead code
- Duplicate functions — same logic in multiple places
- console.log in production — debug code left in
- Missing error handling — operations with no safety net

**Native severity:** High, Medium, Low

**Key difference from SonarQube:**
> *"Codacy focuses on maintainability and best practices — the kind of issues that slow teams down over time. Where SonarQube flags what's broken or dangerous, Codacy flags what's making the codebase harder to work with."*

**Why Codacy needs manual setup:**
> *"Codacy connects to your GitHub repo through their website — there's no API to add repos programmatically. Each repo must be connected once manually, after which Codacy tracks every commit automatically."*

---

### Cross-Tool Comparison

| | Gitleaks | Semgrep | SonarQube | Codacy |
|---|---|---|---|---|
| Primary focus | Secrets | Vulnerabilities | Quality + Security | Maintainability |
| Analysis type | Pattern matching | Pattern + data flow | Deep static analysis | Linting + analysis |
| Speed | Very fast | Fast | Slow (thorough) | Medium |
| False positives | Very low | Low | Medium (hotspots) | Low |
| Native severity | Secret | ERROR/WARNING/INFO | BLOCKER→INFO | High/Medium/Low |
| Runs as | CLI | CLI | Docker + REST API | Cloud API |

---

### Why Multiple Tools?

> *"No single tool catches everything. Each tool has a different focus, different rules, and different blind spots. Running all four gives us overlapping coverage — when two tools independently flag the same issue, that's a high-confidence finding that demands immediate attention."*

**Cross-tool validation examples from our demo:**
- SQL Injection flagged by both SonarQube (BLOCKER) and Codacy (High)
- eval() injection flagged by both Semgrep (ERROR) and Codacy (High)
- Unused variables flagged by both SonarQube (MINOR) and Codacy (Low)
- Hardcoded secrets flagged by both Gitleaks (Secret) and Semgrep (ERROR)