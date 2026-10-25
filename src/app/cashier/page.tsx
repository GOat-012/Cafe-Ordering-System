import { redirect } from "next/navigation";
import { CashierDesk } from "@/components/CashierDesk";
import { getSessionUser } from "@/lib/auth";

export default async function CashierPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fcashier");
  if (!["CASHIER", "ADMIN"].includes(user.role)) redirect("/");
  return <CashierDesk staffName={user.name} />;
}
