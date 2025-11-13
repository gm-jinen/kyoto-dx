import { Routes } from '@angular/router';
import { BaseLayout } from './base-layout/base-layout';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: BaseLayout,
    children: [
      { path: '', component: Dashboard }
    ]
  }
];
