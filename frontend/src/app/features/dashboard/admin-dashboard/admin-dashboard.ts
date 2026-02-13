import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Stats Modal
  showStatsModal = signal(false);
  statsMode = signal<'selection' | 'display' | 'details'>('selection');
  selectedUser = signal<any>(null);
  userStats = signal<any>(null);
  statsLoading = signal(false);

  // Drill Down State
  selectedMetric = signal<string | null>(null);
  metricDetails = signal<any[]>([]);

  // Date Range (Default: Last 30 days)
  startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  endDate = new Date().toISOString().split('T')[0];

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

  // Stats Modal Methods
  openStatsModal(user: any) {
    console.log('AdminDashboard: openStatsModal clicked for', user.uid);
    this.selectedUser.set(user);
    this.statsMode.set('selection');
    this.showStatsModal.set(true);
    this.selectedMetric.set(null);
  }

  showStats() {
    console.log('AdminDashboard: showStats clicked. Mode set to display.');
    this.statsMode.set('display');
    this.fetchUserStats();
  }

  viewMetricDetails(metricKey: string) {
    if (!this.userStats() || !this.userStats().details) return;

    this.selectedMetric.set(metricKey);
    this.metricDetails.set(this.userStats().details[metricKey] || []);
    this.statsMode.set('details');
  }

  backToStats() {
    this.statsMode.set('display');
    this.selectedMetric.set(null);
  }

  closeStatsModal() {
    this.showStatsModal.set(false);
    this.selectedUser.set(null);
    this.userStats.set(null);
    this.statsMode.set('selection');
    this.selectedMetric.set(null);
  }

  async fetchUserStats() {
    if (!this.selectedUser()) return;

    this.statsLoading.set(true);
    // Construct query params
    const start = this.startDate ? new Date(this.startDate).toISOString() : '';
    const end = this.endDate ? new Date(this.endDate).toISOString() : '';

    try {
      const user = this.authService.currentUser();
      if (!user) return;
      const token = await user.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

      const url = `${environment.apiUrl}/admin/stats/${this.selectedUser().uid}?start=${start}&end=${end}`;

      this.http.get<any>(url, { headers }).subscribe({
        next: (data) => this.userStats.set(data),
        error: (err) => console.error('Error fetching user stats:', err),
        complete: () => this.statsLoading.set(false)
      });
    } catch (error) {
      console.error('Error fetching user stats', error);
      this.statsLoading.set(false);
    }
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
