import { cn } from "@repo/ui"
import { useEffect, useRef } from "react"

interface EmailPreviewProps {
  content: string
  className?: string
}

export function EmailPreview({ content, className = "" }: EmailPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current) return

    const doc = iframeRef.current.contentDocument
    if (!doc) return

    // Write the content to the iframe
    doc.open()
    doc.write(content)
    doc.close()

    // Make links open in new tab
    const links = doc.getElementsByTagName("a")
    for (const link of links) {
      link.target = "_blank"
      link.rel = "noopener noreferrer"
    }
  }, [content])

  return (
    <iframe
      ref={iframeRef}
      className={cn("w-full scroll-hidden rounded-md bg-white", className)}
      sandbox="allow-same-origin"
      title="Email Preview"
    />
  )
}
