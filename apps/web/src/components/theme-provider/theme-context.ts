import { createContext } from "react"
import { initialState } from "./state"
import { ThemeProviderState } from "./theme-provider"

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState)
