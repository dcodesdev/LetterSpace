import { Control, FieldPath, FieldValues } from "react-hook-form"
import type { ComponentProps } from "react"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  FormDescription,
  FormMessage,
} from "@repo/ui"

interface FormControlledInputProps<
  TFieldValues extends FieldValues = FieldValues,
> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
  inputProps?: ComponentProps<typeof Input>
}

export function FormControlledInput<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  label,
  description,
  inputProps,
}: FormControlledInputProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
