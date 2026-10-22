// =====================================================================
// MediRecord — MongoDB Setup (NoSQL side)
// Collection: clinical_notes
// Stores flexible, free-text clinical notes + symptom tags per visit.
// Linked back to MySQL via visit_id (and visit.mongo_note_id).
//
// Run with:
//   mongosh mongodb://localhost:27017/medirecord mongodb/mongodb_setup.js
//
// Safe to run repeatedly: creates the collection and indexes only. It inserts
// NO data. Demo data comes from `node scripts/seed-demo.js` (in web/), which
// writes notes that match real MySQL visit rows. Query examples:
// mongodb/mongodb_demo_queries.js
// =====================================================================

use("medirecord");

// ---------------------------------------------------------------------
// 1. Create the collection (only if it does not exist yet)
// ---------------------------------------------------------------------
if (!db.getCollectionNames().includes("clinical_notes")) {
    db.createCollection("clinical_notes");
    print("Created collection: clinical_notes");
} else {
    print("Collection already exists: clinical_notes");
}

// ---------------------------------------------------------------------
// 2. Document structure
// ---------------------------------------------------------------------
// {
//   _id: ObjectId,
//   visit_id: 1,            // reference to MySQL visit.visit_id
//   patient_id: 1,          // reference to MySQL patient.patient_id
//   doctor_id: 2,           // reference to MySQL doctor.doctor_id
//   diagnosis_code: "J45",
//   symptoms: ["chest tightness", "wheezing", "shortness of breath"],
//   notes: "Patient reports wheezing at night and chest tightness on exertion...",
//   created_at: ISODate("2026-10-13T10:30:00Z")
// }

// ---------------------------------------------------------------------
// 3. Indexes
// ---------------------------------------------------------------------

// Text index for keyword search across notes and symptom tags
db.clinical_notes.createIndex(
    { notes: "text", symptoms: "text" },
    { name: "idx_notes_text_search" }
);

// One note per visit; fast lookup when joining back to MySQL by visit_id
db.clinical_notes.createIndex({ visit_id: 1 }, { unique: true });

// Filter by doctor (e.g. "my past cases")
db.clinical_notes.createIndex({ doctor_id: 1 });

// Filter / group by diagnosis code (for analytics)
db.clinical_notes.createIndex({ diagnosis_code: 1 });

print("Indexes ready:");
printjson(db.clinical_notes.getIndexes().map((i) => i.name));

// ---------------------------------------------------------------------
// 4. Application-level join pattern (how the web app combines both databases)
// ---------------------------------------------------------------------
// 1. Query MongoDB for matching clinical_notes documents (text / symptom search)
// 2. Collect the visit_id values from the matched documents
// 3. Query MySQL:  SELECT ... FROM visit v JOIN appointment a ... WHERE v.visit_id IN (?, ?, ...)
// 4. Merge and return the combined SQL + NoSQL result to the frontend
//    (see web/app/api/symptom-search/route.js)
