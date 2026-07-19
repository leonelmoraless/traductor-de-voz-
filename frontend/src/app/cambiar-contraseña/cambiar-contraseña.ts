import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-cambiar-contraseña',
  imports: [
    ButtonModule,
    FormsModule,
    FloatLabelModule,
    InputTextModule,
    PasswordModule,
    DividerModule,
  ],
  templateUrl: './cambiar-contraseña.html',
  styleUrl: './cambiar-contraseña.scss',
})
export class CambiarContraseña {
  passwordAnterior: string = '';
  passwordNueva: string = '';
  confirmPassword: string = '';

  constructor(private router: Router) {}

  cambiarContrasena(): void {
    this.router.navigate(['/translator']);
  }

  volver(): void {
    this.router.navigate(['/translator']);
  }
}
