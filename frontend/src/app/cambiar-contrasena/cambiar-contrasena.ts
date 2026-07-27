import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-cambiar-contrasena',
  imports: [CommonModule, FormsModule, ButtonModule, PasswordModule, FloatLabelModule, InputTextModule],
  templateUrl: './cambiar-contrasena.html',
  styleUrl: './cambiar-contrasena.scss'
})
export class CambiarContrasena {
  private router = inject(Router);

  contrasenaActual = '';
  nuevaContrasena = '';
  confirmarContrasena = '';
  mensajeError = '';
  mensajeExito = '';

  guardar(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!this.contrasenaActual) {
      this.mensajeError = 'Debes introducir tu contraseña actual.';
      return;
    }
    if (this.nuevaContrasena.length < 8) {
      this.mensajeError = 'La nueva contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.nuevaContrasena !== this.confirmarContrasena) {
      this.mensajeError = 'Las contraseñas no coinciden.';
      return;
    }

    // Aquí se conectará con el backend
    console.log('Contraseña cambiada (mock)');
    this.mensajeExito = 'Contraseña actualizada correctamente.';
    this.contrasenaActual = '';
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
  }

  volver(): void {
    this.router.navigate(['/ajustes']);
  }
}
