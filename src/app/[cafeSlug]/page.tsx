import { CustomerMenu } from "@/components/CustomerMenu";

export default async function CafeMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ cafeSlug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { cafeSlug } = await params;
  const { table } = await searchParams;
  return <CustomerMenu cafeSlug={cafeSlug} initialTableId={table} />;
}
