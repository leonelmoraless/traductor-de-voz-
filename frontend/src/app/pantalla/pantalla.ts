import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pantalla',
  imports: [CommonModule, ButtonModule, SelectModule, FormsModule],
  templateUrl: './pantalla.html',
  styleUrl: './pantalla.scss'
})
export class Pantalla {
  idiomas = [
    { name: 'Español', code: 'es' },
    { name: 'Inglés', code: 'en' }
  ];
  targetLang = this.idiomas[0];

  compartirPantalla() {
    console.log('Iniciando overlay de pantalla (funcionalidad backend futura)');
  }
}
