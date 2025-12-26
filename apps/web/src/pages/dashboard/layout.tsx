import { Link, Navigate, Outlet } from "react-router"
import { useLocation } from "react-router"
import { APP_VERSION } from "@repo/shared"
import {
  ScrollArea,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  cn,
} from "@repo/ui"
import {
  ArrowUpCircle,
  Building2,
  FileText,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  LucideIcon,
  Mail,
  Settings,
  User,
  Users,
} from "lucide-react"
import {
  CenteredLoader,
  LetterSpaceText,
  ThemeToggle,
  WithTooltip,
} from "@/components"
import { useSession } from "@/hooks"
import { useUpdateCheck } from "@/hooks/use-update-check"

const sidebarItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/dashboard",
  },
  {
    title: "Campaigns",
    icon: Mail,
    url: "/dashboard/campaigns",
  },
  {
    title: "Subscribers",
    icon: Users,
    url: "/dashboard/subscribers",
  },
  {
    title: "Lists",
    icon: ListOrdered,
    url: "/dashboard/lists",
  },
  {
    title: "Templates",
    icon: FileText,
    url: "/dashboard/templates",
  },
  {
    title: "Messages",
    icon: Mail,
    url: "/dashboard/messages",
  },
  // TODO: Add analytics page
  // {
  //   title: "Analytics",
  //   icon: BarChart,
  //   url: "/dashboard/analytics",
  // },
  {
    title: "Settings",
    icon: Settings,
    url: "/dashboard/settings",
  },
]

function NavItem({
  to,
  Icon,
  children,
  isActive = false,
}: {
  to: string
  Icon?: LucideIcon
  children: React.ReactNode
  isActive?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center px-3 py-2 text-sm rounded-md transition-colors text-sidebar-foreground hover:bg-sidebar-accent",
        {
          "text-sidebar-primary-foreground bg-sidebar-primary hover:bg-sidebar-primary":
            isActive,
        }
      )}
    >
      {Icon && <Icon className="h-4 w-4 mr-3 flex-shrink-0" />}
      {children}
    </Link>
  )
}

/**
 * Renders the main dashboard layout with a sidebar navigation and content area.
 *
 * Redirects to the root path if the user is not authenticated or organization data is missing. Displays a loading state while user data is loading. The sidebar includes navigation links, user and organization info, theme toggle, logout button, and app version. The main area renders nested routes.
 */
export function DashboardLayout() {
  const { orgId, user, organization, logout } = useSession()
  const location = useLocation()
  const { hasUpdate, latestVersion } = useUpdateCheck()

  // Helper function to check if a menu item is active
  const isActive = (itemUrl: string) => {
    // Exact match for dashboard
    if (itemUrl === "/dashboard") {
      return location.pathname === itemUrl
    }
    // For other routes, check if the current path starts with the item URL
    return location.pathname.startsWith(itemUrl)
  }

  if (!orgId) {
    return <Navigate to="/" />
  }

  if (user.isLoading) {
    return <CenteredLoader />
  }

  if (!user.data) {
    return <Navigate to="/" />
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="px-4 py-4">
              <LetterSpaceText as="h2" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem
                      key={item.title}
                      className={"transition-colors"}
                    >
                      <SidebarMenuButton isActive={isActive(item.url)} asChild>
                        <NavItem
                          to={item.url}
                          Icon={item.icon}
                          isActive={isActive(item.url)}
                        >
                          {item.title}
                        </NavItem>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 hover:bg-muted duration-200 rounded-lg w-full p-2 cursor-pointer text-sm">
                  <User className="h-4 w-4" />
                  <span>{user.data?.name}</span>
                </div>
              </div>
              {organization?.name && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 hover:bg-muted duration-200 rounded-lg w-full p-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">
                      {organization.name}
                    </span>
                  </div>
                  <ThemeToggle />
                </div>
              )}
              <div
                className="flex items-center gap-2 hover:bg-muted duration-200 rounded-lg w-full p-2 cursor-pointer text-sm"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </div>

              <div className="flex items-center justify-between gap-2 px-2">
                <WithTooltip content="Current version">
                  <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    v{APP_VERSION}
                  </span>
                </WithTooltip>
                {hasUpdate && (
                  <a
                    href="https://github.com/dcodesdev/LetterSpace/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 transition-colors"
                  >
                    <ArrowUpCircle className="h-3 w-3" />
                    <span>Update available v{latestVersion}</span>
                  </a>
                )}
              </div>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-y-auto w-full bg-background text-foreground">
          <ScrollArea className="h-full">
            <Outlet />
          </ScrollArea>
        </main>
      </div>
    </SidebarProvider>
  )
}
