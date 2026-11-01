import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { DEMO_MODE } from "@/lib/demoData"

async function refreshAfterSave(queryClient: QueryClient, key: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [key] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["activity"] }),
  ])
}

export function useVisitSummaries() {
  return useQuery({ queryKey: ["visit-summaries"], queryFn: () => api.listVisitSummaries(), enabled: !DEMO_MODE, retry: 1 })
}

export function useCreateVisitSummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sourceText: string) => api.createVisitSummary(sourceText),
    onSuccess: () => refreshAfterSave(queryClient, "visit-summaries"),
  })
}

export function useServiceRequests() {
  return useQuery({ queryKey: ["service-requests"], queryFn: () => api.listServiceRequests(), enabled: !DEMO_MODE, retry: 1 })
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sourceText: string) => api.createServiceRequest(sourceText),
    onSuccess: () => refreshAfterSave(queryClient, "service-requests"),
  })
}

export function useCarePlans() {
  return useQuery({ queryKey: ["care-plans"], queryFn: () => api.listCarePlans(), enabled: !DEMO_MODE, retry: 1 })
}

export function useCreateCarePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { sourceText: string; title?: string }) => api.createCarePlan(input),
    onSuccess: () => refreshAfterSave(queryClient, "care-plans"),
  })
}

export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: () => api.listDocuments(), enabled: !DEMO_MODE, retry: 1 })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: () => refreshAfterSave(queryClient, "documents"),
  })
}