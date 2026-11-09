import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { ApplicantHomePage } from '@/features/applicant/ApplicantHomePage'
import { SignInPage } from '@/features/auth/SignInPage'
import { CaseworkerHomePage } from '@/features/caseworker/CaseworkerHomePage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { RouteErrorPage } from '@/features/errors/RouteErrorPage'
import { ForbiddenPage } from '@/features/errors/ForbiddenPage'
import { AppShell } from './AppShell'
import { RequireRole } from './RequireRole'

export function shellRoute(children: RouteObject[]): RouteObject {
  return {
    element: <AppShell />,
    children: [{ errorElement: <RouteErrorPage />, children }],
  }
}

export const routes: RouteObject[] = [
  shellRoute([
    { index: true, element: <Navigate to="/sign-in" replace /> },
    { path: 'sign-in', element: <SignInPage /> },
    { path: 'forbidden', element: <ForbiddenPage /> },
    {
      element: <RequireRole allow={['caseworker', 'supervisor']} />,
      children: [{ path: 'caseworker', element: <CaseworkerHomePage /> }],
    },
    {
      element: <RequireRole allow={['applicant']} />,
      children: [{ path: 'applicant', element: <ApplicantHomePage /> }],
    },
    { path: '*', element: <NotFoundPage /> },
  ]),
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
