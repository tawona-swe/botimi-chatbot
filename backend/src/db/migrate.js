import db, { migrate } from "./index.js";

// Run migration
migrate();

console.log("[DB] Database initialized and migrated.");
