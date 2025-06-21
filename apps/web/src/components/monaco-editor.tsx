import Editor from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { useTheme } from "@/hooks/useTheme"
import { cn } from "@repo/ui"

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  placeholder?: string
  className?: string
  height?: string | number
  disabled?: boolean
  options?: editor.IStandaloneEditorConstructionOptions
}

export function MonacoEditor({
  value,
  onChange,
  language = "javascript",
  placeholder,
  className,
  height = 300,
  disabled = false,
  options = {},
}: MonacoEditorProps) {
  const { theme } = useTheme()

  const handleChange = (value: string | undefined) => {
    onChange(value || "")
  }

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: "on",
    renderLineHighlight: "all",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: "on",
    readOnly: disabled,
    scrollbar: {
      vertical: "auto",
      horizontal: "auto",
    },
    ...options,
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-md border", className)}
    >
      <Editor
        height={typeof height === "number" ? `${height}px` : height}
        language={language}
        theme={theme === "dark" ? "vs-dark" : "vs-light"}
        value={value}
        onChange={handleChange}
        options={defaultOptions}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {placeholder || "Loading editor..."}
          </div>
        }
      />
    </div>
  )
}
