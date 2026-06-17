# Security Policy

## Supported Versions

We actively maintain and patch the latest version of this project.

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅ Yes             |
| older   | ❌ No              |

## Reporting a Vulnerability

If you discover a security vulnerability in this repository, **please do not open a public GitHub issue**.

Instead, report it responsibly by emailing:

📧 **pinnacle.route.solutions@gmail.com**

Please include:
- A clear description of the vulnerability
- Steps to reproduce it
- Potential impact
- Any suggested fix (optional)

We will acknowledge receipt within **48 hours** and aim to release a fix within **7 days** for critical issues.

## Security Best Practices for Contributors

- Never commit real secrets, API keys, tokens, or passwords
- Always use `.env` files locally — they are listed in `.gitignore`
- Use placeholder values in `.env.example` only
- All secrets must be set via environment variables in your hosting provider (e.g. Vercel)
- Run `npm audit` before submitting a pull request

## Disclosure Policy

We follow a **coordinated disclosure** model. We ask that you give us reasonable time to patch before any public disclosure.

Thank you for helping keep this project secure! 🔐
