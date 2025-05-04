import { CampaignContext } from "./context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { campaignSchema, UpdateCampaignOptions } from "./schema"
import { useParams } from "react-router"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"
import { useCallback } from "react"
import { toastError } from "@/utils"

export const EditCampaignLayout: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const { id } = useParams()
  const { orgId } = useSession()
  const utils = trpc.useUtils()

  const campaignQuery = trpc.campaign.get.useQuery(
    {
      id: id ?? "",
      organizationId: orgId ?? "",
    },
    {
      enabled: !!id && !!orgId,
      staleTime: Number.POSITIVE_INFINITY,
    }
  )

  const form = useForm<z.infer<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    values: {
      title: campaignQuery.data?.campaign?.title ?? "",
      description: campaignQuery.data?.campaign?.description ?? "",
      subject: campaignQuery.data?.campaign?.subject ?? "",
      templateId: campaignQuery.data?.campaign?.templateId ?? "",
      listIds:
        campaignQuery.data?.campaign?.CampaignLists?.map(
          (list) => list.listId
        ) ?? [],
      openTracking: campaignQuery.data?.campaign?.openTracking ?? false,
      content: campaignQuery.data?.campaign?.content ?? "",
    },
  })

  const isEditable = campaignQuery.data?.campaign?.status === "DRAFT"

  const updateCampaignMutation = trpc.campaign.update.useMutation()

  const updateCampaign = useCallback(
    (options: UpdateCampaignOptions = {}) => {
      if (!orgId || !id) return

      const values = form.getValues()

      updateCampaignMutation.mutate(
        {
          id,
          organizationId: orgId,
          ...values,
          templateId: values.templateId || null,
        },
        {
          onSuccess({ campaign }) {
            form.reset({
              content: campaign.content || "",
              description: campaign.description || "",
              listIds: campaign.CampaignLists.map((list) => list.listId),
              openTracking: campaign.openTracking,
              subject: campaign.subject || "",
              templateId: campaign.templateId || "",
              title: campaign.title,
            })

            utils.campaign.get.invalidate()
            options.onSuccess?.()
          },
          onError(error) {
            toastError("Error updating campaign", error)
          },
        }
      )
    },
    [id, orgId, updateCampaignMutation, form, utils]
  )

  return (
    <CampaignContext.Provider
      value={{
        form,
        campaignQuery,
        isEditable,
        updateCampaign,
        updatePending: updateCampaignMutation.isPending,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}
