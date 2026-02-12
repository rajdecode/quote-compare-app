class Quote {
    constructor(id, buyerId, productId, postalCode, details = {}) {
        this.id = id;
        this.buyerId = buyerId;
        this.productId = productId;
        this.postalCode = postalCode;
        this.details = details;
        this.status = 'open'; // 'open', 'responded', 'closed'
        this.responses = []; // Array of { vendorId, price, message, date }
        this.createdAt = new Date();
    }

    static fromFirestore(snapshot) {
        const data = snapshot.data();
        const quote = new Quote(snapshot.id, data.buyerId, data.productId, data.postalCode, data.details);
        quote.status = data.status;
        quote.responses = data.responses || [];
        quote.createdAt = data.createdAt.toDate();
        return quote;
    }

    toFirestore() {
        return {
            buyerId: this.buyerId,
            productId: this.productId,
            postalCode: this.postalCode,
            details: this.details,
            status: this.status,
            responses: this.responses,
            createdAt: this.createdAt
        };
    }
}

module.exports = Quote;
