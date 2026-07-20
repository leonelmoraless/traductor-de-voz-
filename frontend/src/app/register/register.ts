import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-register',
  imports: [
    ButtonModule,
    FormsModule,
    FloatLabelModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    DividerModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  email: string = '';
  usuario: string = '';
  password: string = '';
  confirmPassword: string = '';
  terminos: boolean = false;

  constructor(private router: Router) {}

  registrarse(): void {
    this.router.navigate(['/translator']);
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }
}
