import { useContext } from "react"
import { CampaignContext } from "./context"

export function useCampaignContext() {
  const editor = useContext(CampaignContext)

  if (!editor) {
    throw new Error(
      "useEditorContext must be used within a EditorContext Provider"
    )
  }

  return editor
}
