import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(isOpen) {
    <div class="modal-overlay" (click)="cancel.emit()">
      <div class="modal-content confirm-modal" (click)="$event.stopPropagation()">
        
        <div class="icon-header">
          <span class="material-icons warning-icon">help_outline</span>
        </div>

        <h3>Are you sure?</h3>
        <p class="mb-4 text-slate-600">{{ message }}</p>

        <div class="modal-actions" style="display: flex; gap: 12px; justify-content: center; margin-top: 25px;">
          <button class="btn btn-secondary" (click)="cancel.emit()" style="flex: 1;">Cancel</button>
          <button class="btn btn-primary" (click)="confirm.emit()" style="flex: 1; background: #3B82F6;">Confirm</button>
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
      width: 90%; max-width: 400px; text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .icon-header {
      width: 64px; height: 64px; border-radius: 50%; background: #EFF6FF;
      margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;
    }
    .warning-icon { font-size: 2rem; color: #3B82F6; }
    h3 { margin-top: 0; color: #1E293B; font-size: 1.25rem; }
    p { margin: 0; color: #64748B; font-size: 0.95rem; line-height: 1.5; }
    .btn { padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; }
    .btn-secondary { background: white; border: 1px solid #E2E8F0; color: #475569; }
    .btn-primary { color: white; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class ConfirmModalComponent {
  @Input() isOpen: boolean = false;
  @Input() message: string = 'Do you want to proceed?';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
