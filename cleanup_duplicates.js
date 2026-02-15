const admin = require('firebase-admin');
const serviceAccount = require('./backend/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupDuplicates() {
    const quotesSnapshot = await db.collection('quotes').get();

    let totalFixed = 0;

    for (const doc of quotesSnapshot.docs) {
        const data = doc.data();
        if (!data.responses || data.responses.length === 0) continue;

        const uniqueResponses = {};
        const cleanResponses = [];
        let hasDuplicates = false;

        // Keep the LATEST response for each vendor
        // Sort by createdAt desc first
        const sortedResponses = data.responses.sort((a, b) => {
            const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
        });

        for (const response of sortedResponses) {
            if (!uniqueResponses[response.vendorId]) {
                uniqueResponses[response.vendorId] = response;
                cleanResponses.push(response);
            } else {
                hasDuplicates = true;
                console.log(`Found duplicate for vendor ${response.vendorId} in quote ${doc.id}`);
            }
        }

        if (hasDuplicates) {
            await db.collection('quotes').doc(doc.id).update({
                responses: cleanResponses
            });
            totalFixed++;
            console.log(`Fixed quote ${doc.id}`);
        }
    }

    console.log(`Cleanup complete. Fixed ${totalFixed} quotes.`);
}

cleanupDuplicates().catch(console.error);
