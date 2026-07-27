import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { RatingModule } from 'primeng/rating';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-ajustes',
  imports: [CommonModule, FormsModule, DialogModule, RatingModule, TextareaModule],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.scss',
})
export class Ajustes {
  private router = inject(Router);

  // Estado del modal de calificar app
  showAppRatingModal = false;
  appRatingValue = 0;
  appRatingComment = '';

  // Info del usuario (mock - backend futuro)
  user = {
    name: 'Usuario',
    email: 'usuario@email.com',
    plan: 'Plan Básico'
  };

  irAHistorial(): void {
    this.router.navigate(['/historial']);
  }

  irACambiarContrasena(): void {
    this.router.navigate(['/cambiar-contrasena']);
  }

  irAPlanes(): void {
    this.router.navigate(['/planes']);
  }

  cerrarSesion(): void {
    this.router.navigate(['/login']);
  }

  abrirCalificacion(): void {
    this.appRatingValue = 0;
    this.appRatingComment = '';
    this.showAppRatingModal = true;
  }

  enviarCalificacion(): void {
    console.log('Calificación de app:', this.appRatingValue, this.appRatingComment);
    this.showAppRatingModal = false;
  }

  cancelarCalificacion(): void {
    this.showAppRatingModal = false;
  }
}
