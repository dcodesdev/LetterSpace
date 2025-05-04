import { createContext } from "react"
import { ThemeProviderState } from "./theme-provider"
import { initialState } from "./state"

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState)
