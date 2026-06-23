import Link from "next/link";
import { Package } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, source_type, source_url, status, created_at")
    .eq("account_id", ctx.account.id)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as Pick<
    Product,
    "id" | "name" | "source_type" | "source_url" | "status" | "created_at"
  >[];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your product library. Each product can power unlimited ad variations and campaigns."
        actionLabel="New product"
        actionHref="/products/new"
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add a product URL, a TikTok/Reel you own, or upload media to begin generating ads."
          actionLabel="Add your first product"
          actionHref="/products/new"
        />
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <Card className="flex items-center justify-between p-4 transition hover:border-brand-500/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {humanize(p.source_type)}
                    {p.source_url ? ` · ${p.source_url}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone(p.status)}>{humanize(p.status)}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
