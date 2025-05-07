import { cn } from "@repo/ui"

type LetterSpaceTextProps = {
  className?: string
  as?: React.ElementType
}

export const LetterSpaceText = ({
  className,
  as = "p",
}: LetterSpaceTextProps) => {
  const Comp = as

  return (
    <Comp className={cn("text-lg font-semibold", className)}>
      <span>Letter</span>
      <span className="text-brand-primary">Space</span>
    </Comp>
  )
}
