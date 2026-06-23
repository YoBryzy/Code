import { getSessionContext } from "@/lib/account";
import { getDefaultBrandKit } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandForm } from "@/components/brand/brand-form";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const brandKit = await getDefaultBrandKit(ctx.account.id);

  return (
    <div>
      <PageHeader
        title="Brand kit"
        description="Saved once, applied to every ad the AI generates — voice, audience, colors, hashtags."
      />
      <BrandForm initial={brandKit} />
    </div>
  );
}
