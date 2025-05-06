import Script from "next/script"

export function Analytics() {
  return (
    <Script
      id="plausible-script"
      strategy="afterInteractive"
      defer
      data-domain="letterspace.app"
      src="https://analytics.letterspace.app/js/script.js"
    />
  )
}
