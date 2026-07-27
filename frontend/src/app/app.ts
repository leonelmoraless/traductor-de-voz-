import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);
  showNavbar = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Ocultar navbar en rutas de autenticación
      const url = event.urlAfterRedirects;
      const isAuthRoute = url.includes('/login') || url.includes('/register') || url.includes('/recuperar-contrasena') || url.includes('/cambiar-contrasena');
      this.showNavbar.set(!isAuthRoute);
    });
  }
}
