const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function cleanupDuplicates() {
    // 1. Try Firestore
    try {
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = require(serviceAccountPath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            const db = admin.firestore();
            console.log('Connected to Firestore. Cleaning...');

            const quotesSnapshot = await db.collection('quotes').get();
            let totalFixed = 0;

            for (const doc of quotesSnapshot.docs) {
                const data = doc.data();
                if (await cleanQuoteData(data)) {
                    await db.collection('quotes').doc(doc.id).update({
                        responses: data.responses
                    });
                    totalFixed++;
                    console.log(`Fixed Firestore quote ${doc.id}`);
                }
            }
            console.log(`Firestore cleanup complete. Fixed ${totalFixed} quotes.`);
        } else {
            console.log('No serviceAccountKey.json found. Skipping Firestore cleanup.');
        }
    } catch (e) {
        console.error('Firestore cleanup failed:', e.message);
    }

    // 2. Try Local DB
    try {
        const localDbPath = path.join(__dirname, 'data', 'quotes.json');
        if (fs.existsSync(localDbPath)) {
            console.log('Found local quotes.json. Cleaning...');
            const quotes = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
            let totalFixed = 0;

            for (const quote of quotes) {
                if (await cleanQuoteData(quote)) {
                    totalFixed++;
                    console.log(`Fixed Local quote ${quote.id}`);
                }
            }

            if (totalFixed > 0) {
                fs.writeFileSync(localDbPath, JSON.stringify(quotes, null, 2));
                console.log(`Local DB cleanup complete. Fixed ${totalFixed} quotes.`);
            } else {
                console.log('No duplicates found in Local DB.');
            }
        } else {
            console.log('No local quotes.json found.');
        }
    } catch (e) {
        console.error('Local DB cleanup failed:', e.message);
    }
}

async function cleanQuoteData(data) {
    if (!data.responses || data.responses.length === 0) return false;

    const uniqueResponses = {};
    const cleanResponses = [];
    let hasDuplicates = false;

    // Sort by createdAt desc to keep latest
    const sortedResponses = [...data.responses].sort((a, b) => {
        const dateA = new Date(a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt);
        const dateB = new Date(b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt);
        return dateB - dateA;
    });

    for (const response of sortedResponses) {
        if (!uniqueResponses[response.vendorId]) {
            uniqueResponses[response.vendorId] = response;
            cleanResponses.push(response);
        } else {
            hasDuplicates = true;
        }
    }

    if (hasDuplicates) {
        // Reverse back to text/original order if needed, or just keep sorted?
        // Let's keep sorted by latest for display
        data.responses = cleanResponses;
        return true;
    }
    return false;
}

cleanupDuplicates();
