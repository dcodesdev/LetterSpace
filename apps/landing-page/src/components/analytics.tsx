import Script from "next/script"

export function Analytics() {
  return (
    <Script
      id="plausible-script"
      strategy="afterInteractive"
      defer
      data-domain="letterspace.dcodes.dev"
      src="https://analytics.letterspace.app/js/script.js"
    />
  )
}
