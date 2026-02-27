import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-success-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if(isOpen()) {
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content success-modal" (click)="$event.stopPropagation()">
        
        <!-- Animated Success Icon -->
        <div class="success-icon-wrapper">
          <div class="success-icon-bg"></div>
          <span class="material-icons check-icon">check_circle</span>
        </div>

        <h3 style="margin-top: 20px; color: #10B981; font-size: 1.5rem;">Success!</h3>
        <p style="color: #475569; font-size: 1.1rem; margin-bottom: 25px; max-width: 300px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          {{ message() }}
        </p>

        <button class="btn btn-primary" (click)="close.emit()" style="width: 100%; max-width: 200px; font-size: 1.05rem; padding: 12px; background: #10B981; border: none; border-radius: 12px;">
          Continue
        </button>
      </div>
    </div>
    }
  `,
    styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    .modal-content {
      background: white; padding: 40px; border-radius: 20px;
      width: 90%; max-width: 450px; text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .success-icon-wrapper {
      position: relative; width: 80px; height: 80px;
      margin: 0 auto; display: flex; align-items: center; justify-content: center;
    }

    .success-icon-bg {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: #D1FAE5; border-radius: 50%;
      animation: pulseBg 2s infinite ease-in-out;
    }

    .check-icon {
      font-size: 4rem; color: #10B981; position: relative; z-index: 1;
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      opacity: 0; transform: scale(0.5);
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulseBg {
      0% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 0.4; }
      100% { transform: scale(1); opacity: 0.8; }
    }
    @keyframes popIn {
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class SuccessModalComponent {
    @Input() isOpen = signal<boolean>(false);
    @Input() message = signal<string>('Action completed successfully.');
    @Output() close = new EventEmitter<void>();
}
