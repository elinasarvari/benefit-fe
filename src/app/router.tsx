import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { ApplicantHomePage } from '@/features/applicant/ApplicantHomePage'
import { ApplyPage } from '@/features/applicant/apply/ApplyPage'
import { HistoryPage } from '@/features/applicant/history/HistoryPage'
import { ApplicantCasePage } from '@/features/applicant/cases/ApplicantCasePage'
import { SignInPage } from '@/features/auth/SignInPage'
import { CasePage } from '@/features/caseworker/case-page/CasePage'
import { CaseworkerHomePage } from '@/features/caseworker/CaseworkerHomePage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { RouteErrorPage } from '@/features/errors/RouteErrorPage'
import { ForbiddenPage } from '@/features/errors/ForbiddenPage'
import { PlaceholderPage } from '@/features/placeholders/PlaceholderPage'
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
      children: [
        { path: 'caseworker', element: <CaseworkerHomePage /> },
        { path: 'caseworker/cases/:caseId', element: <CasePage /> },
        // MVP contracts: placeholders until 007a and 008 land.
        {
          path: 'caseworker/households/:householdId',
          element: <PlaceholderPage title="Household" />,
        },
        { path: 'caseworker/metrics', element: <PlaceholderPage title="Program metrics" /> },
      ],
    },
    {
      element: <RequireRole allow={['applicant']} />,
      children: [
        { path: 'applicant', element: <ApplicantHomePage /> },
        { path: 'applicant/apply', element: <ApplyPage /> },
        { path: 'applicant/cases/:caseId', element: <ApplicantCasePage /> },
        // MVP contracts: placeholders until 011 lands.
        { path: 'applicant/notices', element: <PlaceholderPage title="Notices" /> },
        { path: 'applicant/notices/:noticeId', element: <PlaceholderPage title="Notice" /> },
        {
          path: 'applicant/requests/:noticeId',
          element: <PlaceholderPage title="Respond to a request" />,
        },
        { path: 'applicant/history', element: <HistoryPage /> },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ]),
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
