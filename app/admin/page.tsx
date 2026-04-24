import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminLoginForm } from "@/components/admin/admin-login-form"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getPortfolioContent } from "@/lib/portfolio-store"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin - Hoppsann",
  description: "Admin tools for managing portfolio content.",
}

export default async function AdminPage() {
  const isAuthenticated = await isAdminAuthenticated()
  const content = isAuthenticated ? await getPortfolioContent() : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      {isAuthenticated && content ? <AdminDashboard content={content} /> : <AdminLoginForm />}
    </div>
  )
}
