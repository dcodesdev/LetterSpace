import { trpc } from "@/trpc"
import Cookies from "js-cookie"
import { useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "react-router"
import { useLocalStorage } from "usehooks-ts"

export function useSession() {
  const [orgId, setOrgId, removeOrgId] = useLocalStorage("orgId", "")
  const user = trpc.user.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  const organization = useMemo(() => {
    return (
      user.data?.UserOrganizations.find((uo) => uo.organizationId === orgId)
        ?.Organization || null
    )
  }, [user.data, orgId])

  const navigate = useNavigate()

  useEffect(() => {
    if (!user.isLoading && !user.data) {
      navigate("/")
    }

    if (!orgId) {
      navigate("/")
    }
  }, [orgId, user.data, navigate, user.isLoading])

  const logout = useCallback(() => {
    removeOrgId()
    Cookies.remove("token")
    window.location.href = "/"
  }, [removeOrgId])

  return { orgId, setOrgId, user, organization, logout }
}
