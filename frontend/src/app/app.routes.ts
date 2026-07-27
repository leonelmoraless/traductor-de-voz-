import { Routes } from '@angular/router';
import { Login } from './login/login';
import { VoiceTranslator } from './voice-translator/voice-translator';
import { PlanPremium } from './plan-premium/plan-premium';
import { Register } from './register/register';
import { RecuperarContrasena } from './recuperar-contrasena/recuperar-contrasena';
import { Pantalla } from './pantalla/pantalla';
import { Audio } from './audio/audio';
import { Ajustes } from './ajustes/ajustes';
import { Historial } from './historial/historial';
import { CambiarContrasena } from './cambiar-contrasena/cambiar-contrasena';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'translator', component: VoiceTranslator },
  { path: 'pantalla', component: Pantalla },
  { path: 'audio', component: Audio },
  { path: 'ajustes', component: Ajustes },
  { path: 'historial', component: Historial },
  { path: 'cambiar-contrasena', component: CambiarContrasena },
  { path: 'planes', component: PlanPremium },
  { path: 'register', component: Register },
  { path: 'recuperar-contrasena', component: RecuperarContrasena },
  { path: '**', redirectTo: 'login' }
];
