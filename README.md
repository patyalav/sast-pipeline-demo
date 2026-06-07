# SAST Pipeline Demo

A local demonstration pipeline that scans a GitHub repository using four SAST tools in parallel and presents findings in a unified dashboard.

---

## What It Does

1. You submit a GitHub repository URL via the browser
2. The pipeline clones the repo and runs all 4 tools simultaneously
3. A live progress page shows each tool's status in real time
4. A dashboard displays findings per tool with native severity labels
5. A full JSON report is available for download

---

## Tools Used

| Tool | Purpose | Type |
|---|---|---|
| Gitleaks | Secret detection — API keys, tokens, credentials | CLI |
| Semgrep | OWASP vulnerability patterns — SQLi, XSS | CLI |
| SonarQube | Code quality, bugs, security hotspots | Docker + REST API |
| Codacy | Best practices, complexity, error-prone patterns | Cloud API |

---

## Prerequisites

All of the following must be installed and configured before running the project.

### 1. Node.js
- Download: https://nodejs.org (LTS version)
- Verify: `node -v`

### 2. Git
- Download: https://git-scm.com
- Verify: `git --version`
- **Always use Git Bash as your terminal — not PowerShell or CMD**

### 3. Python 3.x
- Download: https://python.org
- Required for Semgrep
- Verify: `python --version`

### 4. Gitleaks
- Download: https://github.com/gitleaks/gitleaks/releases
- Download the Windows x64 zip, extract `gitleaks.exe`
- Move `gitleaks.exe` to a permanent folder (e.g. `C:\sast-tools\`)
- Add that folder to your Windows PATH (System Environment Variables)
- Verify: `gitleaks version`

### 5. Semgrep
- Install via pip:
```bash
pip install semgrep
```
- On Windows — always set this before running scans:
```bash
export PYTHONUTF8=1
```
- Verify: `semgrep --version`

### 6. Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Required to run SonarQube locally
- Must be running before starting the server
- Verify: `docker --version`

### 7. SonarQube (via Docker)
- Pull and start the container:
```bash
docker run -d -p 9000:9000 sonarqube:community
```
- Wait ~2 minutes then open: http://localhost:9000
- Default login: `admin` / `admin` (change on first login)
- Generate a token: **My Account → Security → Generate Token**
- Add token to `.env` as `SONARQUBE_TOKEN`

### 8. Codacy
- Sign up at: https://app.codacy.com
- Connect your GitHub repository
- Generate an API token: **Account → API Tokens**
- Add token to `.env` as `CODACY_TOKEN`

---

## Installation

### Step 1 — Clone the repository
```bash
git clone https://github.com/patyalav/sast-pipeline-demo.git
cd sast-pipeline-demo
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Configure environment
```bash
cp .env.example .env
```
Open `.env` and fill in all values — see `.env.example` for the full list.

### Step 4 — Start Docker Desktop
Start Docker Desktop and wait for the engine to show as running.

### Step 5 — Start SonarQube
```bash
docker run -d -p 9000:9000 sonarqube:community
```
Wait ~2 minutes. Verify at http://localhost:9000.

### Step 6 — Start the server
```bash
node server.js
```

### Step 7 — Open the app
Open your browser at: http://localhost:3000

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```
PORT=3000
SONARQUBE_URL=http://localhost:9000
SONARQUBE_TOKEN=<your-sonarqube-token>
SONARQUBE_PROJECT_KEY=<your-project-key>
CODACY_TOKEN=<your-codacy-api-token>
CODACY_ORG=gh/<your-github-username>
CODACY_REPO=<your-repo-name>
REPORTS_DIR=./reports
LOG_FILE=./demo-pipeline.log
DEBUG_MODE=true
```

---

## Project Structure

```
sast-pipeline-demo/
├── server.js           ← Express server + API routes
├── orchestrator.js     ← Parallel tool runner
├── statusManager.js    ← Real-time scan status tracker
├── logger.js           ← Winston logger
├── config.js           ← Centralised config
├── agents/             ← One file per SAST tool
├── utils/              ← Validator, cleanup, report combiner
├── public/             ← Frontend HTML pages
├── reports/            ← Timestamped scan output (local only)
└── docs/               ← ProjectMemory, Cheatsheet, guides
```

---

## Demo Day Startup Checklist

- [ ] Docker Desktop is running
- [ ] SonarQube container is running (`docker ps`)
- [ ] SonarQube is reachable at http://localhost:9000
- [ ] `.env` is populated with all tokens
- [ ] `node server.js` started — no errors in terminal
- [ ] Browser open at http://localhost:3000

---

## Notes

- `reports/` folder is excluded from Git — scan output stays local
- `.env` is excluded from Git — never commit secrets
- Server must stay running while scanning — do not close the terminal
- Open a second terminal for any Git or curl commands while server is running

---

## Documentation

| File | Purpose |
|---|---|
| `docs/ProjectMemory.md` | Full project context — how to resume in any session |
| `docs/Cheatsheet.md` | All commands and concepts used in this project |
| `docs/NormalisationRisks.md` | Why cross-tool severity normalisation is avoided |
