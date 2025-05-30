import { useState, useRef } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism"
import { cn } from "@repo/ui"
import { useTheme } from "@/hooks/useTheme"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
  disabled?: boolean
}

export function CodeEditor({
  value,
  onChange,
  placeholder,
  className,
  rows = 10,
  disabled = false,
}: CodeEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlighterRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  const isDark = theme === "dark"
  const syntaxTheme = isDark ? oneDark : oneLight

  // Synchronize scroll positions
  const handleScroll = () => {
    if (textareaRef.current && highlighterRef.current) {
      const textarea = textareaRef.current
      const highlighter = highlighterRef.current
      highlighter.scrollTop = textarea.scrollTop
      highlighter.scrollLeft = textarea.scrollLeft
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + "  " + value.substring(end)
      onChange(newValue)

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative overflow-hidden rounded-md border border-input bg-background">
        {/* Syntax highlighted background */}
        <div
          ref={highlighterRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
            fontSize: "14px",
            lineHeight: "20px",
            padding: "12px",
            margin: 0,
            border: "none",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            tabSize: 2,
          }}
        >
          <SyntaxHighlighter
            language="javascript"
            style={syntaxTheme}
            customStyle={{
              margin: 0,
              padding: 0,
              background: "transparent",
              fontFamily: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              tabSize: 2,
            }}
            showLineNumbers={false}
            wrapLines={false}
            wrapLongLines={false}
            PreTag="div"
            CodeTag="div"
          >
            {value || " "}
          </SyntaxHighlighter>
        </div>

        {/* Transparent textarea overlay */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn(
            "relative z-10 w-full bg-transparent text-transparent font-mono outline-none resize-none",
            "placeholder:text-muted-foreground",
            isFocused && "ring-1 ring-ring",
            disabled && "cursor-not-allowed opacity-50"
          )}
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
            fontSize: "14px",
            lineHeight: "20px",
            padding: "12px",
            margin: 0,
            border: "none",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            minHeight: `${rows * 20 + 24}px`,
            caretColor: "hsl(var(--foreground))",
            tabSize: 2,
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  )
}
