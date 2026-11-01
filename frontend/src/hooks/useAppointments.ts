import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { DEMO_MODE, demoAppointments } from "@/lib/demoData"
import { toAppointmentRequest } from "@/lib/mappers"
import type { AppointmentDraft, CreateAppointmentInput } from "@/types"

function useRefreshAppointmentData() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["activity"] }),
    ])
}

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => (DEMO_MODE ? demoAppointments : (await api.listAppointments()).map(toAppointmentRequest)),
    retry: 1,
  })
}

/** Raw API records, including the AI draft, for the review queue. Live mode only. */
export function useAppointmentRecords() {
  return useQuery({
    queryKey: ["appointments", "records"],
    queryFn: () => api.listAppointments(),
    enabled: !DEMO_MODE,
    retry: 1,
  })
}

export function useCreateAppointment() {
  const refresh = useRefreshAppointmentData()
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => api.createAppointment(input),
    // Refresh even when the AI fails: the request is still saved, marked as failed.
    onSettled: () => refresh(),
  })
}

export function useAppointmentReview() {
  const refresh = useRefreshAppointmentData()
  return {
    save: useMutation({
      mutationFn: ({ id, draft }: { id: string; draft: AppointmentDraft }) => api.updateAppointment(id, draft),
      onSettled: () => refresh(),
    }),
    approve: useMutation({ mutationFn: (id: string) => api.approveAppointment(id), onSettled: () => refresh() }),
    reject: useMutation({ mutationFn: (id: string) => api.rejectAppointment(id), onSettled: () => refresh() }),
    retry: useMutation({ mutationFn: (id: string) => api.retryAppointment(id), onSettled: () => refresh() }),
    cancel: useMutation({ mutationFn: (id: string) => api.cancelAppointment(id), onSettled: () => refresh() }),
  }
}