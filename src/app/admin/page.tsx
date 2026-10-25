import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getSessionUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (user.role !== "ADMIN") redirect("/");
  return <AdminDashboard staffName={user.name} />;
}
