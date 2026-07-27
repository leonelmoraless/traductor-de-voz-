import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface HistorialItem {
  id: number;
  sourceLang: string;
  targetLang: string;
  originalText: string;
  translatedText: string;
  timeAgo: string;
}

@Component({
  selector: 'app-historial',
  imports: [CommonModule],
  templateUrl: './historial.html',
  styleUrl: './historial.scss'
})
export class Historial {
  private router = inject(Router);

  // Datos de ejemplo (mock data — backend futuro)
  translations: HistorialItem[] = [
    {
      id: 1,
      sourceLang: 'ES',
      targetLang: 'EN',
      originalText: 'ahora nada más para subir y estar aquí',
      translatedText: 'now nothing more to go up and be here',
      timeAgo: 'Hace 2 min'
    },
    {
      id: 2,
      sourceLang: 'EN',
      targetLang: 'ES',
      originalText: 'Hi, how are you doing today?',
      translatedText: 'Hola, ¿cómo estás hoy?',
      timeAgo: 'Hace 15 min'
    },
    {
      id: 3,
      sourceLang: 'ES',
      targetLang: 'EN',
      originalText: 'Necesito ayuda con esta traducción',
      translatedText: 'I need help with this translation',
      timeAgo: 'Hace 1h'
    },
    {
      id: 4,
      sourceLang: 'EN',
      targetLang: 'ES',
      originalText: 'The meeting starts at three o\'clock',
      translatedText: 'La reunión empieza a las tres en punto',
      timeAgo: 'Ayer'
    },
  ];

  volver(): void {
    this.router.navigate(['/ajustes']);
  }
}
