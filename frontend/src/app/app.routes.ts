import { Routes } from '@angular/router';
import { Login } from './login/login';
import { VoiceTranslator } from './voice-translator/voice-translator';
import { PlanPremium } from './plan-premium/plan-premium';
import { Register } from './register/register';
import { CambiarContraseña } from './cambiar-contraseña/cambiar-contraseña';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'translator', component: VoiceTranslator },
  { path: 'planes', component: PlanPremium },
  { path: 'register', component: Register },
  { path: 'cambiar-contrasena', component: CambiarContraseña },
  { path: '**', redirectTo: 'login' }
];
