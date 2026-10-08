# Security policy

## Scope

This repository contains client examples and the public description of a read-only server. The
server itself runs on vuntum.com. Both are in scope for a report; see
[docs/PRIVACY_AND_SECURITY.md](docs/PRIVACY_AND_SECURITY.md) for the design.

## Report a vulnerability

Write to contact@vuntum.com, the contact published on
[vuntum.com](https://vuntum.com/fr/mentions-legales). Put "Security" in the subject.
GitHub private vulnerability reporting is not enabled on this repository.

Please include what you found, the steps to reproduce it, and the date and time you tested.
Do not open a public issue for a vulnerability, and do not test with a volume of requests that
degrades the service.

No response time is promised: this is a small project.

## What is not a vulnerability

- A wrong value in the data: that is a data correction, see [CONTRIBUTING.md](CONTRIBUTING.md).
- HTTP 429 when you exceed the rate limit described in [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

## Supported versions

Only the current state of the `main` branch and the live server at `https://vuntum.com/mcp`.
