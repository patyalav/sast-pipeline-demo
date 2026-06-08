# Findings Guide — sast-pipeline-demo

> **Purpose:** Plain English explanation of every finding shown on the dashboard.
> Use this as a reference during demos and stakeholder presentations.
> Each finding includes: what it is, why it matters, and how to fix it.

---

## Summary

| Tool | Findings | Severity Levels |
|---|---|---|
| Gitleaks | 4 | Secret (x4) |
| Semgrep | 6 | ERROR (x2), WARNING (x4) |
| SonarQube | 4 | BLOCKER, CRITICAL, MAJOR, MINOR |
| Codacy | 4 | High (x2), Medium, Low |
| **Total** | **18** | |

---

## 🔑 Gitleaks — Secret Detection

> Gitleaks scans all files for patterns that look like real credentials —
> API keys, tokens, passwords, and secrets that should never be in source code.

---

### Finding 1 — Generic API Key
| Field | Detail |
|---|---|
| Severity | Secret |
| File | `config/secrets.cfg` |
| Line | 12 |
| Rule | `generic-api-key` |

**What it is:**
A generic API key pattern was found hardcoded in a config file.

**Why it matters:**
Anyone with access to the source code — including attackers who breach the repo — can use this key to access the service it belongs to.

**How to fix:**
Remove the key from the file. Store it in an environment variable and load it at runtime:
```javascript
const apiKey = process.env.INTERNAL_API_KEY;
```

---

### Finding 2 — Mailgun Private API Token
| Field | Detail |
|---|---|
| Severity | Secret |
| File | `config/secrets.cfg` |
| Line | 16 |
| Rule | `mailgun-private-api-token` |

**What it is:**
A Mailgun API token — used to send emails — was found hardcoded in source code.

**Why it matters:**
An attacker with this token can send emails on behalf of your domain — phishing attacks, spam, or account takeover emails.

**How to fix:**
```
MAILGUN_API_KEY=your-key-here   ← store in .env
```
```javascript
const mailgunKey = process.env.MAILGUN_API_KEY;  ← load at runtime
```

---

### Finding 3 — Twilio API Key
| Field | Detail |
|---|---|
| Severity | Secret |
| File | `config/secrets.cfg` |
| Line | 20 |
| Rule | `twilio-api-key` |

**What it is:**
A Twilio API key — used to send SMS messages — was found hardcoded in source code.

**Why it matters:**
An attacker can use this key to send SMS messages at your expense — fraud, phishing, or running up bills.

**How to fix:**
Store in environment variable — never in source code or config files committed to Git.

---

### Finding 4 — Slack Webhook URL
| Field | Detail |
|---|---|
| Severity | Secret |
| File | `config/secrets.cfg` |
| Line | 24 |
| Rule | `slack-webhook-url` |

**What it is:**
A Slack Incoming Webhook URL — used to post messages to a Slack channel — was found in source code.

**Why it matters:**
Anyone with this URL can post messages to your Slack workspace — spreading misinformation or social engineering attacks against your team.

**How to fix:**
Rotate the webhook URL immediately in Slack settings. Store the new URL in an environment variable.

---

## 🔎 Semgrep — OWASP Vulnerability Patterns

> Semgrep scans code for known vulnerability patterns mapped to the OWASP Top 10.
> It analyses how data flows through the application — from user input to dangerous operations.

---

### Finding 5 — XSS via HTML Construction (WARNING)
| Field | Detail |
|---|---|
| Severity | WARNING |
| File | `routes/search.js` |
| Line | 16 |
| Rule | XSS — user data in HTML |

**What it is:**
User input from a URL query parameter is directly concatenated into an HTML string and sent back to the browser.

**Why it matters:**
An attacker can craft a URL like:
```
/search?q=<script>document.cookie</script>
```
This script executes in the victim's browser — stealing session cookies or redirecting to malicious sites. This is **Reflected XSS** — OWASP A03.

**How to fix:**
Never build HTML by concatenating user input. Use a template engine that auto-escapes:
```javascript
res.render('search', { searchTerm: req.query.q });
```

---

### Finding 6 — XSS via Direct Response Write (WARNING)
| Field | Detail |
|---|---|
| Severity | WARNING |
| File | `routes/search.js` |
| Line | 17 |
| Rule | XSS — direct response write |

**What it is:**
User-controlled data is written directly to the HTTP response without sanitisation.

**Why it matters:**
Same risk as Finding 5 — Semgrep identified this from a different angle. Two rules independently flagging the same line confirms the vulnerability is real.

**How to fix:**
Use `res.render()` with a template engine instead of `res.send()` with raw HTML.

---

### Finding 7 — eval() Dangerous Usage (WARNING)
| Field | Detail |
|---|---|
| Severity | WARNING |
| File | `routes/search.js` |
| Line | 27 |
| Rule | eval() usage detected |

**What it is:**
`eval()` is used in the codebase. This function executes a string as JavaScript code.

**Why it matters:**
If any user-controlled data reaches `eval()`, the attacker can execute arbitrary code on the server. Even without user input, `eval()` makes code hard to review and maintain.

**How to fix:**
Never use `eval()`. Use `JSON.parse()` for parsing data, or redesign the logic to avoid dynamic code execution entirely.

---

### Finding 8 — eval() Code Injection (ERROR)
| Field | Detail |
|---|---|
| Severity | ERROR |
| File | `routes/search.js` |
| Line | 27 |
| Rule | User data flows into eval() |

**What it is:**
Data from an Express web request flows directly into `eval()` — confirmed code injection vulnerability.

**Why it matters:**
This is a **confirmed** path from user input to `eval()` — not just a warning. An attacker sending:
```
{ "filter": "require('child_process').exec('rm -rf /')" }
```
would execute system commands on your server.

**How to fix:**
Remove `eval()` entirely. Redesign the filter logic using safe alternatives.

---

### Finding 9 — MD5 Password Hashing (WARNING)
| Field | Detail |
|---|---|
| Severity | WARNING |
| File | `utils/crypto.js` |
| Line | 20 |
| Rule | MD5 used for password hash |

**What it is:**
MD5 is used to hash passwords before storing them.

**Why it matters:**
MD5 is cryptographically broken. Attackers use pre-computed rainbow tables to crack MD5 hashes in seconds. A database breach exposes all user passwords immediately.

**How to fix:**
Use `bcrypt` — designed specifically for password hashing with a slow, salted algorithm:
```javascript
const bcrypt = require('bcrypt');
const hash   = await bcrypt.hash(password, 12);
```

---

### Finding 10 — DES Broken Encryption (ERROR)
| Field | Detail |
|---|---|
| Severity | ERROR |
| File | `utils/crypto.js` |
| Line | 28 |
| Rule | Deprecated createCipher used |

**What it is:**
The deprecated `crypto.createCipher()` function is used with DES encryption.

**Why it matters:**
DES uses a 56-bit key — brute-forceable in hours with modern hardware. The deprecated `createCipher` also generates the same IV every time — making encrypted data vulnerable to pattern analysis attacks.

**How to fix:**
Use AES-256 with a random IV:
```javascript
const cipher = crypto.createCipheriv('aes-256-gcm', key, crypto.randomBytes(16));
```

---

## 📊 SonarQube — Code Quality & Security
> ⚠️ Pre-configured demo data — findings are illustrative.
> SonarQube requires project pre-provisioning — see talking points.

---

### Finding 11 — SQL Injection (BLOCKER)
| Field | Detail |
|---|---|
| Severity | BLOCKER |
| File | `demo_login.js` |
| Line | 12 |
| Rule | `javascript:S2077` |

**What it is:**
User input is directly concatenated into a SQL query string.

**Why it matters:**
An attacker can pass `' OR '1'='1` as a username to bypass login entirely, or `'; DROP TABLE users; --` to destroy data. This is **OWASP A03 — Injection** — the most critical web vulnerability.

**How to fix:**
Always use parameterised queries:
```javascript
db.query('SELECT * FROM users WHERE username = ?', [username]);
```

---

### Finding 12 — Hardcoded Database Password (CRITICAL)
| Field | Detail |
|---|---|
| Severity | CRITICAL |
| File | `demo_database.js` |
| Line | 10 |
| Rule | `javascript:S2068` |

**What it is:**
A database password is hardcoded directly in the source code.

**Why it matters:**
Anyone who can read the source code — including attackers who breach the repo — has direct access to the production database. This affects every record in the database.

**How to fix:**
```
DB_PASSWORD=your-password   ← .env file
```
```javascript
password: process.env.DB_PASSWORD   ← load at runtime
```

---

### Finding 13 — High Cognitive Complexity (MAJOR)
| Field | Detail |
|---|---|
| Severity | MAJOR |
| File | `demo_helper.js` |
| Line | 10 |
| Rule | `javascript:S3776` |

**What it is:**
A function has a cognitive complexity score of 15 — exceeding the recommended maximum of 10. This means deeply nested conditions and branches that are hard to follow.

**Why it matters:**
Complex code is harder to review — security vulnerabilities hide in complexity. It's also harder to test, maintain, and hand over to other developers.

**How to fix:**
Break the function into smaller focused functions — each doing one thing. Aim for a maximum nesting depth of 3 levels.

---

### Finding 14 — Unused Variable (MINOR)
| Field | Detail |
|---|---|
| Severity | MINOR |
| File | `demo_helper.js` |
| Line | 78 |
| Rule | `javascript:S1481` |

**What it is:**
A variable is declared but never used anywhere in the code.

**Why it matters:**
Unused variables are dead code — they add noise, confuse reviewers, and can indicate incomplete refactoring or forgotten logic.

**How to fix:**
Remove the unused variable declaration entirely.

---

## 🛡️ Codacy — Best Practices & Complexity
> ⚠️ Pre-configured demo data — findings are illustrative.
> Codacy requires manual repo connection — see talking points.

---

### Finding 15 — SQL Injection (High)
| Field | Detail |
|---|---|
| Severity | High |
| File | `demo_login.js` |
| Line | 12 |
| Rule | `sql-injection` |

**What it is:**
Same SQL injection vulnerability as Finding 11 — Codacy independently identified the same issue from a best practices perspective.

**Why it matters:**
Two tools — SonarQube and Codacy — independently flagging the same line provides **cross-tool validation**. This is a confirmed high-risk vulnerability.

**How to fix:**
Use parameterised queries — same fix as Finding 11.

---

### Finding 16 — eval() Code Injection (High)
| Field | Detail |
|---|---|
| Severity | High |
| File | `demo_search.js` |
| Line | 27 |
| Rule | `no-eval` |

**What it is:**
Same eval() code injection as Finding 8 — Codacy independently confirmed this vulnerability.

**Why it matters:**
Three tools — Semgrep, SonarQube (via BLOCKER on login), and Codacy — all flagged eval() usage. Consistent findings across tools = high confidence vulnerability.

**How to fix:**
Remove `eval()` entirely — same fix as Finding 8.

---

### Finding 17 — Empty Catch Block (Medium)
| Field | Detail |
|---|---|
| Severity | Medium |
| File | `demo_helper.js` |
| Line | 55 |
| Rule | `no-empty-catch` |

**What it is:**
A `try/catch` block has an empty `catch` — errors are silently swallowed and never logged or handled.

**Why it matters:**
When something goes wrong, there's no indication — the application silently continues in a potentially broken state. This makes debugging extremely difficult and can mask security-relevant errors.

**How to fix:**
Always handle or log caught errors:
```javascript
try {
  // operation
} catch (err) {
  logger.error('Operation failed:', err.message);
  throw err; // or handle gracefully
}
```

---

### Finding 18 — Unused Variable (Low)
| Field | Detail |
|---|---|
| Severity | Low |
| File | `demo_helper.js` |
| Line | 78 |
| Rule | `no-unused-vars` |

**What it is:**
Same unused variable as Finding 14 — Codacy independently flagged the same dead code.

**Why it matters:**
Both SonarQube and Codacy flagged the same unused variable — cross-tool consistency on even minor issues shows the pipeline catches everything from BLOCKER to Low severity.

**How to fix:**
Remove the unused variable declaration.

---

## Cross-Tool Validation Summary

One of the most powerful demo talking points — multiple tools independently finding the same issues:

| Issue | Gitleaks | Semgrep | SonarQube | Codacy |
|---|---|---|---|---|
| SQL Injection in login | — | — | ✅ BLOCKER | ✅ High |
| eval() code injection | — | ✅ ERROR | — | ✅ High |
| Unused variable | — | — | ✅ MINOR | ✅ Low |
| Hardcoded secrets | ✅ Secret | ✅ ERROR | ✅ CRITICAL | — |

> *"When multiple independent tools flag the same vulnerability — that's not noise, that's signal. High confidence findings that demand immediate attention."*
