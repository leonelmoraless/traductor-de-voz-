import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  selector: 'app-recuperar-contrasena',
  imports: [
    RouterModule,
    ButtonModule,
    FormsModule,
    FloatLabelModule,
    InputTextModule
  ],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.scss',
})
export class RecuperarContrasena {
  email: string = '';

  constructor(private router: Router) {}

  enviarCorreo(): void {
    // Aquí iría la lógica para enviar el correo de recuperación
    console.log('Correo de recuperación enviado a:', this.email);
    this.router.navigate(['/recuperar-contrasena']);
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
