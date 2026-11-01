import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { DEMO_MODE, demoAppointments } from "@/lib/demoData"
import { toAppointmentRequest } from "@/lib/mappers"
import type { CreateAppointmentInput } from "@/types"

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => (DEMO_MODE ? demoAppointments : (await api.listAppointments()).map(toAppointmentRequest)),
    retry: 1,
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => api.createAppointment(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
      ])
    },
  })
}
