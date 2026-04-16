/**
 * Migration: Standardize `prices` and `duration` on ServiceModel
 *
 * What it does:
 *  - Replaces the existing `prices` array with 3 fixed tiers: Basic / Standard / Premium
 *  - Sets (or overwrites) `duration` with a random value between 1–6 (hours)
 *  - Touches NOTHING else on the document
 *
 * Usage:
 *  1. Paste your MongoDB URI below (MONGO_URI)
 *  2. node migrate-services.js
 */

const { MongoClient } = require("mongodb");

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const MONGO_URI = "mongodb://localhost:27017/skillo"; // <-- paste your URI here
const DB_NAME   ="skillo";                    // null = use the DB name from the URI
const COLLECTION = "servicemodels";        // MongoDB lowercases + pluralises model names

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Random integer inclusive of both ends */
const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Build 3 pricing tiers.
 * Prices are reasonable defaults (can be adjusted).
 * Basic < Standard < Premium, with some random spread so they feel real.
 */
function buildPrices() {
  const base    = randInt(500,  1500);  // e.g. 500–1500
  const mid     = base  + randInt(500, 1500);
  const premium = mid   + randInt(500, 2000);

  return [
    { label: "Basic",    price: base    },
    { label: "Standard", price: mid     },
    { label: "Premium",  price: premium },
  ];
}

/** Random duration 1–6 hours */
const buildDuration = () => randInt(1, 6);

// ─── MIGRATION ───────────────────────────────────────────────────────────────

async function migrate() {
  if (!MONGO_URI || MONGO_URI === "YOUR_MONGODB_URI_HERE") {
    console.error("❌  Please set MONGO_URI before running this script.");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);

  try {
    console.log("🔌  Connecting to MongoDB…");
    await client.connect();

    // Resolve DB: prefer explicit DB_NAME, else pull from URI, else throw.
    const dbName =
      DB_NAME ||
      (() => {
        const match = MONGO_URI.match(/\/([^/?]+)(\?|$)/);
        if (!match) throw new Error("Cannot resolve DB name from URI. Set DB_NAME explicitly.");
        return match[1];
      })();

    const db         = client.db(dbName);
    const collection = db.collection(COLLECTION);

    const totalDocs = await collection.countDocuments();
    console.log(`📦  Found ${totalDocs} document(s) in '${COLLECTION}'.\n`);

    if (totalDocs === 0) {
      console.log("⚠️   Nothing to migrate.");
      return;
    }

    const cursor = collection.find({});

    let updated  = 0;
    let failed   = 0;
    let skipped  = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      try {
        const newPrices   = buildPrices();
        const newDuration = buildDuration();

        await collection.updateOne(
          { _id: doc._id },
          {
            $set: {
              prices:   newPrices,
              duration: newDuration,
            },
          }
        );

        updated++;

        // Log every 10th doc so the terminal isn't flooded on large collections
        if (updated % 10 === 0 || updated === 1) {
          console.log(`  ✅  Updated ${updated}/${totalDocs} — _id: ${doc._id}`);
        }
      } catch (docErr) {
        failed++;
        console.error(`  ❌  Failed on _id ${doc._id}:`, docErr.message);
      }
    }

    // Final summary
    skipped = totalDocs - updated - failed;

    console.log("\n─────────────────────────────────");
    console.log(`✔  Migration complete.`);
    console.log(`   Updated : ${updated}`);
    if (failed  > 0) console.log(`   Failed  : ${failed}`);
    if (skipped > 0) console.log(`   Skipped : ${skipped}`);
    console.log("─────────────────────────────────\n");

  } catch (err) {
    console.error("\n❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔒  Connection closed.");
  }
}

migrate();