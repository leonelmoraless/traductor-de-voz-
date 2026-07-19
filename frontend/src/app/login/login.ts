import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-login',
  imports: [ButtonModule, FormsModule, FloatLabelModule, InputTextModule, PasswordModule, DividerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  username: string = '';
  password: string = '';

  constructor(private router: Router) {}

  entrar(): void {
    this.router.navigate(['/translator']);
  }

  irARegistro(): void {
    this.router.navigate(['/register']);
  }

  irACambiarContrasena(): void {
    this.router.navigate(['/cambiar-contrasena']);
  }

}