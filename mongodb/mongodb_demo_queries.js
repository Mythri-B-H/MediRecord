// =====================================================================
// MediRecord — MongoDB DEMO QUERIES (NoSQL side)
//
//   mongosh mongodb://localhost:27017/medirecord mongodb/mongodb_demo_queries.js
//
// Prerequisite: demo data loaded with `node scripts/seed-demo.js` (web/).
// Read-only: nothing here changes data.
// =====================================================================

use("medirecord");

print("\n=== 1. Collection overview ===");
print("clinical_notes documents: " + db.clinical_notes.countDocuments());
printjson(db.clinical_notes.getIndexes().map((i) => i.name));

print("\n=== 2. TEXT SEARCH: 'chest tightness wheezing' (ranked by relevance) ===");
printjson(
    db.clinical_notes
        .find(
            { $text: { $search: "chest tightness wheezing" } },
            { _id: 0, visit_id: 1, symptoms: 1, diagnosis_code: 1, score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .toArray()
);

print("\n=== 3. TAG MATCH: cases sharing at least one symptom ===");
printjson(
    db.clinical_notes
        .find(
            { symptoms: { $in: ["wheezing", "fever"] } },
            { _id: 0, visit_id: 1, diagnosis_code: 1, symptoms: 1 }
        )
        .toArray()
);

print("\n=== 4. FILTER: diagnosis J45 (asthma) cases ===");
printjson(
    db.clinical_notes
        .find({ diagnosis_code: "J45" }, { _id: 0, visit_id: 1, doctor_id: 1, symptoms: 1 })
        .toArray()
);

print("\n=== 5. AGGREGATION: most common symptoms per diagnosis ===");
printjson(
    db.clinical_notes
        .aggregate([
            { $unwind: "$symptoms" },
            {
                $group: {
                    _id: { diagnosis_code: "$diagnosis_code", symptom: "$symptoms" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            {
                $group: {
                    _id: "$_id.diagnosis_code",
                    top_symptoms: { $push: { symptom: "$_id.symptom", count: "$count" } },
                },
            },
            { $sort: { _id: 1 } },
        ])
        .toArray()
);

print("\n=== 6. AGGREGATION: notes per doctor ===");
printjson(
    db.clinical_notes
        .aggregate([
            { $group: { _id: "$doctor_id", notes: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ])
        .toArray()
);

print("\n=== 7. INDEX PROOF: text search uses the text index ===");
const plan = db.clinical_notes
    .find({ $text: { $search: "wheezing" } })
    .explain("queryPlanner").queryPlanner.winningPlan;
printjson(plan);
