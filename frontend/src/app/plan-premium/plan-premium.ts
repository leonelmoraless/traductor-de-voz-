import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-plan-premium',
  imports: [CommonModule, ButtonModule],
  templateUrl: './plan-premium.html',
  styleUrl: './plan-premium.scss'
})
export class PlanPremium {
  private router = inject(Router);

  planActual = 'basico'; // Cambiar según el usuario autenticado

  seleccionarBasico(): void {
    console.log('Plan Básico seleccionado');
  }

  seleccionarPro(): void {
    console.log('Plan Pro seleccionado');
  }

  volver(): void {
    this.router.navigate(['/ajustes']);
  }
}
