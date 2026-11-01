import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { DEMO_MODE, demoActivity } from "@/lib/demoData"

export function useActivity(limit = 100) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: () => (DEMO_MODE ? Promise.resolve(demoActivity) : api.listActivity(limit)),
    retry: 1,
  })
}
