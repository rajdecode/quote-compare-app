import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboard {
  authService = inject(AuthService);
  private http = inject(HttpClient);

  users = signal<any[]>([]);
  stats = signal<any>(null);
  loading = signal<boolean>(true);
  activeTab = signal<'users' | 'analytics'>('users');

  constructor() {
    this.fetchData();
  }

  async fetchData() {
    this.loading.set(true);
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

      // Fetch Users
      this.http.get<any[]>(`${environment.apiUrl}/admin/users`, { headers }).subscribe({
        next: (data) => this.users.set(data),
        error: (err) => console.error('Error fetching users:', err)
      });

      // Fetch Stats
      this.http.get<any>(`${environment.apiUrl}/admin/stats`, { headers }).subscribe({
        next: (data) => this.stats.set(data),
        error: (err) => console.error('Error fetching stats:', err)
      });

    } catch (error) {
      console.error('Error initializing admin data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  setActiveTab(tab: 'users' | 'analytics') {
    this.activeTab.set(tab);
  }

  async toggleUserStatus(userId: string, currentStatus: string) {
    if (!confirm(`Are you sure you want to ${currentStatus === 'active' ? 'block' : 'unblock'} this user?`)) return;

    const user = this.authService.currentUser();
    if (!user) return;
    const token = await user.getIdToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';

    this.http.patch(`${environment.apiUrl}/admin/users/${userId}`, { status: newStatus }, { headers }).subscribe({
      next: () => {
        // Update local state
        this.users.update(users => users.map(u =>
          u.uid === userId ? { ...u, status: newStatus } : u
        ));
      },
      error: (err) => alert('Failed to update status: ' + err.message)
    });
  }
}
