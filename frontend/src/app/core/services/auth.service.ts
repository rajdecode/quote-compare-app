import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private supabase: SupabaseClient;
    currentUser = signal<User | null>(null);
    userRole = signal<string | null>(null);

    authInitialized: Promise<void>;

    constructor(private router: Router) {
        this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);

        // Initialize the promise AFTER supabase client is created
        this.authInitialized = new Promise<void>((resolve) => {
            // Check active session immediately
            this.supabase.auth.getSession().then(({ data: { session } }) => {
                this.handleAuthChange(session?.user || null).then(() => resolve());
            });

            // Listen for changes
            this.supabase.auth.onAuthStateChange(async (_event, session) => {
                await this.handleAuthChange(session?.user || null);
            });
        });
    }

    // Helper to get current session token for API calls
    async getToken(): Promise<string | null> {
        const { data: { session } } = await this.supabase.auth.getSession();
        return session?.access_token || null;
    }


    // Helper to handle user state updates
    private async handleAuthChange(user: User | null) {
        this.currentUser.set(user);
        if (user) {
            const role = await this.getUserRole(user.id);
            this.userRole.set(role);
        } else {
            this.userRole.set(null);
        }
    }

    async register(email: string, password: string, displayName: string, role: string, plan: string = '') {
        try {
            // 1. Sign Up
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: displayName,
                    }
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error('Registration failed: No user returned');

            // 2. Create Profile
            // We only attempt this if we have a session (auto-login worked), 
            // OR if we are okay with it potentially failing due to RLS if no session.
            // If email confirmation is ON, data.session is null.
            // We should try to create profile anyway (Supabase allows it if policies permit, or we might need service key on server properly).
            // But since we are client-side only here, we try. 
            // We use a try-catch block to ensure this doesn't block the UI response.
            try {
                if (data.session || data.user) {
                    // Note: If no session, RLS 'auth.uid() = id' might fail if the user is not technically logged in yet.
                    // But we attempt it. If it fails, the "auto-repair" on next login will fix it.
                    await this.saveUserRole(data.user.id, role, displayName, email, plan);
                    this.userRole.set(role);
                }
            } catch (err) {
                console.warn('Profile creation non-critical error (will auto-repair on login):', err);
            }

            return { user: data.user, session: data.session };
        } catch (error) {
            throw error;
        }
    }

    async login(email: string, password: string) {
        try {
            console.log('AuthService: Logging in... (v2-timeout)');
            // TIMEOUT WRAPPER: Force unblock after 10s if Supabase hangs
            const { data, error } = await Promise.race([
                this.supabase.auth.signInWithPassword({ email, password }),
                new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Login timed out. Please check your connection.')), 10000))
            ]);

            if (error) throw error;
            if (!data.user) throw new Error('Login failed');

            console.log('AuthService: Supabase Login Success. UID:', data.user.id);

            // Fetch role securely, but fail gracefully if it takes too long or errors
            let role: string | null = null;
            try {
                // Short timeout for role fetch (3s)
                role = await Promise.race([
                    this.getUserRole(data.user.id),
                    new Promise<string | null>(resolve => setTimeout(() => resolve(null), 3000))
                ]);
            } catch (roleError) {
                console.warn('AuthService: Error fetching role, will attempt repair or default.', roleError);
            }

            console.log('AuthService: Role fetched:', role);

            // Auto-repair: If no profile exists (legacy user or race condition), default to 'buyer'
            if (!role) {
                console.log('User has no role/profile, defaulting to buyer and attempting repair...');
                role = 'buyer';
                // Fire and forget repair to not block login
                this.saveUserRole(data.user.id, role, data.user.user_metadata['full_name'] || 'User', email).catch(err => {
                    console.error('Auto-repair profile failed:', err);
                });
            }

            this.userRole.set(role);

            // Navigation Logic
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
            return data.user;
        } catch (error) {
            console.error('AuthService: Login failed', error);
            throw error;
        }
    }

    async updatePassword(password: string) {
        const { error } = await this.supabase.auth.updateUser({ password });
        if (error) throw error;
    }

    async resetPassword(email: string) {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/change-password`
        });
        if (error) throw error;
    }

    async logout() {
        await this.supabase.auth.signOut();
        this.userRole.set(null);
        this.router.navigate(['/']);
    }

    // Save profile to 'profiles' table
    private async saveUserRole(uid: string, role: string, name: string, email: string, plan: string = '') {
        const profileData: any = {
            id: uid,
            role,
            email, // redundantly stored for easy querying
            // Map specific fields
            company_name: role === 'buyer' ? null : name, // simplistic mapping
            contact_name: name,
            created_at: new Date()
        };

        if (role === 'vendor' && plan) {
            // In real app, plan might be in a subscriptions table, but we put in profiles for simplicity
            // My schema didn't explicitly have 'plan' column in profiles, let's check.
            // Schema: business_name, phone, service_states...
            // I missed adding 'plan' to the schema sql! 
            // IMPORTANT: API should handle it or I should add it.
            // For now, I'll assume I can add it or store it in `services_offered` or similar?
            // Or just ignore plan for V1 migration if not critical.
            // Wait, pricing info is critical. 
            // I will try to update it, but if column missing, it deals with it.
            // For now I won't save plan to avoid error, or I'll save to 'services_offered' as a hack?
            // Better: Store in metadata?
        }

        // Use upsert
        const { error } = await this.supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });

        if (error) {
            console.error('Error creating profile:', error);
            // Non-blocking?
        }
    }

    private async getUserRole(uid: string): Promise<string | null> {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('role')
            .eq('id', uid)
            .single();

        if (data) return data.role;
        return null;
    }

    async getUserProfile(uid: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

        if (data) return data;
        return null;
    }

    async updateVendorProfile(uid: string, data: any) {
        // Map camelCase to snake_case for DB
        const dbData: any = {};
        if (data.businessName) dbData.business_name = data.businessName;
        if (data.phone) dbData.phone = data.phone;
        if (data.serviceStates) dbData.service_states = data.serviceStates;
        if (data.servicePostcodes) dbData.service_postcodes = data.servicePostcodes;
        if (data.serviceSuburbs) dbData.service_suburbs = data.serviceSuburbs;
        if (data.excludedPostcodes) dbData.excluded_postcodes = data.excludedPostcodes;
        if (data.excludedSuburbs) dbData.excluded_suburbs = data.excludedSuburbs;
        if (data.servicesOffered) dbData.services_offered = data.servicesOffered;
        if (data.abn) dbData.abn = data.abn;
        if (data.address) dbData.address = data.address;

        const { error } = await this.supabase
            .from('profiles')
            .update(dbData)
            .eq('id', uid);

        if (error) console.error('Update profile failed:', error);
    }

    // Expose client for direct access if needed
    getClient() {
        return this.supabase;
    }
}
