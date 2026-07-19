import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-plan-premium',
  imports: [ButtonModule, CardModule],
  templateUrl: './plan-premium.html',
  styleUrl: './plan-premium.scss',
})
export class PlanPremium {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/translator']);
  }
}
