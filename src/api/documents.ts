import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { components } from './generated/schema'

type Schemas = components['schemas']

export type PayStubUpload = Schemas['PayStubUpload']
export type CaseVerification = Schemas['CaseVerification']
export type DocumentView = Schemas['DocumentView']
export type Finding = Schemas['Finding']
export type MissingDocument = Schemas['MissingDocument']

// Keys include the case ID, so one case's documents never show under another (FE-4, FE-5).
export const caseVerificationKey = (caseId: string) => ['case', caseId, 'verification'] as const

// Step 1 of an upload: the typed details. The case may not exist yet (ADR-002-01), so the caller
// passes the ID `caseIdFor(reference)` gave. Throws `ApiError` on any refusal.
export async function createPayStub(caseId: string, body: PayStubUpload): Promise<string> {
  const { data } = await apiClient.POST('/api/v1/cases/{case_id}/documents', {
    params: { path: { case_id: caseId } },
    body,
  })
  if (!data) {
    throw new Error('Empty pay stub response')
  }
  return data.document_id
}

// Step 2: the file's own bytes and type (PDF, PNG or JPEG).
export async function uploadPayStubContent(
  caseId: string,
  documentId: string,
  file: File,
): Promise<void> {
  await apiClient.PUT('/api/v1/cases/{case_id}/documents/{document_id}/content', {
    params: { path: { case_id: caseId, document_id: documentId } },
    body: file as unknown as string,
    bodySerializer: (body: unknown) => body as BodyInit,
    headers: { 'Content-Type': file.type },
  })
}

// The writes as mutation hooks (FE-4): the caller reads pending and error state from them.
export function useCreatePayStub() {
  return useMutation({
    mutationFn: ({ caseId, body }: { caseId: string; body: PayStubUpload }) =>
      createPayStub(caseId, body),
  })
}

export function useUploadPayStubContent() {
  return useMutation({
    mutationFn: ({
      caseId,
      documentId,
      file,
    }: {
      caseId: string
      documentId: string
      file: File
    }) => uploadPayStubContent(caseId, documentId, file),
  })
}

export function useCaseVerification(caseId: string) {
  return useQuery({
    queryKey: caseVerificationKey(caseId),
    enabled: caseId !== '',
    queryFn: async (): Promise<CaseVerification> => {
      const { data } = await apiClient.GET('/api/v1/cases/{case_id}/verification', {
        params: { path: { case_id: caseId } },
      })
      if (!data) {
        throw new Error('Empty verification response')
      }
      return data
    },
  })
}
