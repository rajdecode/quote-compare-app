class User {
    constructor(uid, email, role, profile = {}) {
        this.uid = uid;
        this.email = email;
        this.role = role; // 'guest', 'buyer', 'vendor', 'admin'
        this.profile = profile;
        this.createdAt = new Date();
    }

    static fromFirestore(snapshot) {
        const data = snapshot.data();
        return new User(snapshot.id, data.email, data.role, data.profile);
    }

    toFirestore() {
        return {
            email: this.email,
            role: this.role,
            profile: this.profile,
            createdAt: this.createdAt
        };
    }
}

module.exports = User;
