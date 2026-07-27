import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-audio',
  imports: [CommonModule, ButtonModule],
  templateUrl: './audio.html',
  styleUrl: './audio.scss'
})
export class Audio {
  iniciarTraduccion() {
    console.log('Iniciando traducción de audio externo (funcionalidad backend futura)');
  }
}
