import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-login',
  imports: [
    RouterModule,
    ButtonModule,
    FormsModule,
    FloatLabelModule,
    InputTextModule,
    PasswordModule,
  ],
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

  recuperarContrasena(): void {
    this.router.navigate(['/recuperar-contrasena']);
  }
}