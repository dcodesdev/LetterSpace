import { useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "react-router"
import Cookies from "js-cookie"
import { useLocalStorage } from "usehooks-ts"
import { trpc } from "@/trpc"

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
    if (user.isLoading) return

    if (!user.data) {
      Cookies.remove("token")
      navigate("/", { replace: true })
      return
    }

    if (!orgId) {
      const firstOrgId = user.data.UserOrganizations[0]?.organizationId
      if (firstOrgId) {
        setOrgId(firstOrgId)
      } else {
        navigate("/onboarding", { replace: true })
      }
    }
  }, [orgId, setOrgId, user.data, navigate, user.isLoading])

  const logout = useCallback(() => {
    removeOrgId()
    Cookies.remove("token")
    window.location.href = "/"
  }, [removeOrgId])

  return { orgId, setOrgId, user, organization, logout }
}
