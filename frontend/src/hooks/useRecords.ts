import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { DEMO_MODE } from "@/lib/demoData"
import type { CarePlanTaskChanges, ServiceClassificationDraft, VisitSummaryDraft } from "@/types"

async function refreshAfterSave(queryClient: QueryClient, key: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [key] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["activity"] }),
  ])
}

function useRefresh(key: string) {
  const queryClient = useQueryClient()
  return () => refreshAfterSave(queryClient, key)
}

// ---------- Visit summaries ----------

export function useVisitSummaries() {
  return useQuery({ queryKey: ["visit-summaries"], queryFn: () => api.listVisitSummaries(), enabled: !DEMO_MODE, retry: 1 })
}

export function useCreateVisitSummary() {
  const refresh = useRefresh("visit-summaries")
  return useMutation({
    mutationFn: (sourceText: string) => api.createVisitSummary(sourceText),
    // Refresh even when the AI fails: the record is still saved, marked as failed.
    onSettled: () => refresh(),
  })
}

export function useVisitSummaryReview() {
  const refresh = useRefresh("visit-summaries")
  return {
    save: useMutation({
      mutationFn: ({ id, draft }: { id: string; draft: VisitSummaryDraft }) => api.updateVisitSummary(id, draft),
      onSettled: () => refresh(),
    }),
    approve: useMutation({ mutationFn: (id: string) => api.approveVisitSummary(id), onSettled: () => refresh() }),
    reject: useMutation({ mutationFn: (id: string) => api.rejectVisitSummary(id), onSettled: () => refresh() }),
    retry: useMutation({ mutationFn: (id: string) => api.retryVisitSummary(id), onSettled: () => refresh() }),
    cancel: useMutation({ mutationFn: (id: string) => api.cancelVisitSummary(id), onSettled: () => refresh() }),
  }
}

// ---------- Service requests ----------

export function useServiceRequests() {
  return useQuery({ queryKey: ["service-requests"], queryFn: () => api.listServiceRequests(), enabled: !DEMO_MODE, retry: 1 })
}

export function useCreateServiceRequest() {
  const refresh = useRefresh("service-requests")
  return useMutation({
    mutationFn: (sourceText: string) => api.createServiceRequest(sourceText),
    onSettled: () => refresh(),
  })
}

export function useServiceRequestReview() {
  const refresh = useRefresh("service-requests")
  return {
    save: useMutation({
      mutationFn: ({ id, draft }: { id: string; draft: ServiceClassificationDraft }) =>
        api.updateServiceRequest(id, draft),
      onSettled: () => refresh(),
    }),
    approve: useMutation({ mutationFn: (id: string) => api.approveServiceRequest(id), onSettled: () => refresh() }),
    reject: useMutation({ mutationFn: (id: string) => api.rejectServiceRequest(id), onSettled: () => refresh() }),
    retry: useMutation({ mutationFn: (id: string) => api.retryServiceRequest(id), onSettled: () => refresh() }),
    cancel: useMutation({ mutationFn: (id: string) => api.cancelServiceRequest(id), onSettled: () => refresh() }),
  }
}

// ---------- Care plans ----------

export function useCarePlans() {
  return useQuery({ queryKey: ["care-plans"], queryFn: () => api.listCarePlans(), enabled: !DEMO_MODE, retry: 1 })
}

export function useCreateCarePlan() {
  const refresh = useRefresh("care-plans")
  return useMutation({
    mutationFn: (input: { sourceText: string; title?: string }) => api.createCarePlan(input),
    onSettled: () => refresh(),
  })
}

// ---------- Documents ----------

export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: () => api.listDocuments(), enabled: !DEMO_MODE, retry: 1 })
}

export function useUploadDocument() {
  const refresh = useRefresh("documents")
  return useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSettled: () => refresh(),
  })
}

// ---------- Care plan review ----------

export function useCarePlanActions() {
  const refresh = useRefresh("care-plans")
  const settle = { onSettled: () => refresh() }
  return {
    retry: useMutation({ mutationFn: (planId: string) => api.retryCarePlan(planId), ...settle }),
    cancel: useMutation({ mutationFn: (planId: string) => api.cancelCarePlan(planId), ...settle }),
    approvePlan: useMutation({ mutationFn: (planId: string) => api.approveCarePlan(planId), ...settle }),
    rejectPlan: useMutation({ mutationFn: (planId: string) => api.rejectCarePlan(planId), ...settle }),
    addTask: useMutation({
      mutationFn: ({ planId, description }: { planId: string; description: string }) =>
        api.addCarePlanTask(planId, { description }),
      ...settle,
    }),
    updateTask: useMutation({
      mutationFn: ({ taskId, changes }: { taskId: string; changes: CarePlanTaskChanges }) =>
        api.updateCarePlanTask(taskId, changes),
      ...settle,
    }),
    deleteTask: useMutation({ mutationFn: (taskId: string) => api.deleteCarePlanTask(taskId), ...settle }),
    approveTask: useMutation({ mutationFn: (taskId: string) => api.approveCarePlanTask(taskId), ...settle }),
    rejectTask: useMutation({ mutationFn: (taskId: string) => api.rejectCarePlanTask(taskId), ...settle }),
  }
}

// ---------- Document item review ----------

export function useDocumentItemActions() {
  const refresh = useRefresh("documents")
  const settle = { onSettled: () => refresh() }
  return {
    save: useMutation({
      mutationFn: ({ itemId, draft }: { itemId: string; draft: Record<string, unknown> }) =>
        api.updateDocumentItem(itemId, draft),
      ...settle,
    }),
    approve: useMutation({ mutationFn: (itemId: string) => api.approveDocumentItem(itemId), ...settle }),
    reject: useMutation({ mutationFn: (itemId: string) => api.rejectDocumentItem(itemId), ...settle }),
  }
}