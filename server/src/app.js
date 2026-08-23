import express from "express";

/**
 * Express application boundary.
 *
 * This module defines the app only — it does not call listen() and does
 * not connect to the database. That separation is what server.js exists
 * for, and is deliberately preserved to avoid the v1 startup import
 * mismatch (server.js/app.js export shape disagreement) documented in
 * server/README.md.
 *
 * createApp() is a factory rather than a shared singleton instance so
 * tests can construct an isolated app per test run without import-order
 * side effects.
 */
export function createApp() {
  const app = express();

  app.use(express.json());

  // Minimal health check — no business logic, no DB dependency check yet.
  app.get("/api/v1/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // No route matched.
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Not found",
    });
  });

  // Centralized error-handling boundary. Deliberately minimal at this
  // milestone: it exists so thrown/forwarded errors have one place to
  // land, not to encode the full API error contract (see ADR-0006's
  // note that the exact error representation belongs to that contract,
  // not to persistence-layer ADRs).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("[app] Unhandled error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

export default createApp;
