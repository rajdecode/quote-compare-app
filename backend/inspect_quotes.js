const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function inspectQuotes() {
    console.log('--- Inspecting Quotes ---');

    // 1. Inspect Local DB
    try {
        const localDbPath = path.join(__dirname, 'data', 'quotes.json');
        if (fs.existsSync(localDbPath)) {
            console.log('\n[Local DB Content]');
            const quotes = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
            quotes.forEach(q => printQuote(q));
        }
    } catch (e) {
        console.log('Local DB read error:', e.message);
    }

    // 2. Inspect Firestore
    try {
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = require(serviceAccountPath);
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            const db = admin.firestore();
            console.log('\n[Firestore Content]');

            const quotesSnapshot = await db.collection('quotes').get();
            quotesSnapshot.forEach(doc => {
                printQuote({ id: doc.id, ...doc.data() });
            });
        }
    } catch (e) {
        console.log('Firestore read error:', e.message);
    }
}

function printQuote(q) {
    console.log(`\nQuote ID: ${q.id}`);
    console.log(`Buyer: ${q.buyerId.substring(0, 8)}... | Status: ${q.status}`);
    console.log(`Responses: ${q.responses?.length || 0}`);
    if (q.responses) {
        q.responses.forEach((r, i) => {
            const date = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt;
            console.log(`  [${i}] Vendor: ${r.vendorName} | Status: ${r.status} | Price: ${r.price} | Date: ${date} | History: ${r.history?.length || 0}`);
        });
    }
}

inspectQuotes();
