import { Injectable, signal } from '@angular/core';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '../config/firebase.config';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.apiUrl;
    currentUser = signal<User | null>(null);
    userRole = signal<string | null>(null);
    private db = getFirestore();

    // Promise that resolves when auth state is first determined
    authInitialized = new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            this.currentUser.set(user);
            if (user) {
                const role = await this.getUserRole(user.uid);
                this.userRole.set(role);
            } else {
                this.userRole.set(null);
            }
            resolve();
            unsubscribe(); // We only need this one-time trigger for initialization
        });

        // Re-subscribe for ongoing updates
        onAuthStateChanged(auth, async (user) => {
            this.currentUser.set(user);
            // Logic repeated to ensure updates are caught after init
            if (user) {
                const role = await this.getUserRole(user.uid);
                this.userRole.set(role);
            } else {
                this.userRole.set(null);
            }
        });
    });

    constructor(private router: Router) { }

    async register(email: string, password: string, displayName: string, role: string, plan: string = '') {
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(credential.user, { displayName });
            await this.saveUserRole(credential.user.uid, role, displayName, email, plan);
            this.userRole.set(role);
            return credential.user;
        } catch (error) {
            throw error;
        }
    }

    async login(email: string, password: string) {
        try {
            console.log('AuthService: Logging in...');
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('AuthService: Firebase SigIn Success. UID:', result.user.uid);

            let role = await this.getUserRole(result.user.uid);
            console.log('AuthService: Role fetched:', role);

            // Auto-repair: If no role exists (legacy user), default to 'buyer' and save it
            if (!role) {
                console.log('User has no role, defaulting to buyer');
                role = 'buyer';
                await this.saveUserRole(result.user.uid, role, result.user.displayName || 'User', result.user.email || email);
            }

            this.userRole.set(role);

            if (role === 'buyer') {
                this.router.navigate(['/buyer']);
            } else if (role === 'vendor') {
                this.router.navigate(['/vendor']);
            } else if (role === 'admin') {
                console.log('AuthService: Redirecting to /admin');
                this.router.navigate(['/admin']);
            } else {
                console.warn('AuthService: Unknown role, redirecting home');
                this.router.navigate(['/']);
            }
            return result.user;
        } catch (error) {
            console.error('AuthService: Login failed', error);
            throw error;
        }
    }

    async logout() {
        await signOut(auth);
        this.userRole.set(null);
        this.router.navigate(['/']);
    }

    private async saveUserRole(uid: string, role: string, name: string, email: string, plan: string = '') {
        const userRef = doc(this.db, 'users', uid);
        const userData: any = {
            uid,
            role,
            displayName: name,
            email,
            createdAt: new Date()
        };

        if (plan) {
            userData.plan = plan;
            if (plan === 'trial') {
                userData.trialStartDate = new Date();
                userData.quotesResponded = 0;
            }
        }

        await setDoc(userRef, userData, { merge: true });
    }

    private async getUserRole(uid: string): Promise<string | null> {
        const userRef = doc(this.db, 'users', uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data()['role'];
        }
        return null;
    }
}
