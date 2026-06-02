# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in bdusage, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use [GitHub Security Advisories](https://github.com/watany-dev/bdusage/security/advisories/new) to report the vulnerability privately.

You should receive a response within 72 hours. If the vulnerability is confirmed, a fix will be released as soon as possible.

## Security Considerations

- bdusage uses the AWS SDK credential chain. No credentials are stored or transmitted by the application itself beyond what AWS APIs require for the configured operation.
- Prompt, request, and response bodies from Bedrock invocation logs are not fetched or displayed by design.
- Error messages should be sanitized to avoid leaking sensitive AWS resource details where possible.
- `--principal self` in direct CLI mode is a UX filter, not a security boundary. Use managed mode (v0.4) for enforced principal scoping.
