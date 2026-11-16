import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guard';
import { AuthService } from './core/auth.service';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'clases',
        loadComponent: () => import('./pages/classes/classes.page').then((m) => m.ClassesPage),
      },
      {
        path: 'clases/:id',
        loadComponent: () => import('./pages/class-detail/class-detail.page').then((m) => m.ClassDetailPage),
      },
      {
        path: 'escanear',
        loadComponent: () => import('./pages/scan/scan.page').then((m) => m.ScanPage),
      },
      {
        path: 'historial',
        loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => (inject(AuthService).isTeacher() ? 'clases' : 'escanear'),
      },
    ],
  },
  { path: '', redirectTo: 'app', pathMatch: 'full' },
  { path: '**', redirectTo: 'app' },
];
