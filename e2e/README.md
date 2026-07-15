# End-to-end tests

Cross-application Playwright journey tests live here. Each suite must boot its own in-memory
`@jeswr/solid-server` instance and must not assume a fixed port.

The scaffold test verifies that the root Playwright runner loads without downloading a browser.
Run the suite from the repository root with `pnpm run test:e2e`.
