import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-complete-job-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    @if(isOpen()) {
    <div class="modal-overlay" (click)="cancel.emit()">
      <div class="modal-content glass-panel" (click)="$event.stopPropagation()">
        <h3 style="margin-top: 0; font-size: 1.5rem; color: #1E293B; margin-bottom: 20px;">Complete Job</h3>
        
        <div class="form-group" style="text-align: left;">
            <label style="color: #475569; font-weight: 600; display: block; margin-bottom: 8px;">Final Invoice URL / Link</label>
            <input type="url" [(ngModel)]="invoiceUrl" placeholder="https://link-to-invoice.com/..." 
                   style="width: 100%; padding: 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 1rem; margin-bottom: 25px;">
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
            <button class="btn btn-primary" 
                    [style.opacity]="invoiceUrl ? '1' : '0.5'" 
                    [style.cursor]="invoiceUrl ? 'pointer' : 'not-allowed'"
                    [disabled]="!invoiceUrl" 
                    (click)="submit()">Submit Invoice & Complete</button>
        </div>
      </div>
    </div>
    }
  `,
    styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      animation: fadeIn 0.2s ease;
    }
    .modal-content {
      background: white; padding: 30px; border-radius: 16px;
      width: 90%; max-width: 500px; text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn { padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; }
    .btn-secondary { background: white; border: 1px solid #E2E8F0; color: #475569; }
    .btn-primary { background: #3B82F6; color: white; transition: all 0.2s; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class CompleteJobModalComponent {
    @Input() isOpen = signal<boolean>(false);
    @Output() confirm = new EventEmitter<string>();
    @Output() cancel = new EventEmitter<void>();

    invoiceUrl: string = '';

    submit() {
        if (this.invoiceUrl.trim()) {
            this.confirm.emit(this.invoiceUrl);
            this.invoiceUrl = ''; // Reset after submit
        }
    }
}
