import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { KitchenBoard } from "@/components/KitchenBoard";

export default async function KitchenPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fkitchen");
  if (!["KITCHEN", "ADMIN"].includes(user.role)) redirect("/");
  return <KitchenBoard staffName={user.name} />;
}
