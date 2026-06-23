import { Clapperboard } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";
import type { Video } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("id, title, status, duration_sec, thumbnail_path, created_at")
    .eq("account_id", ctx.account.id)
    .order("created_at", { ascending: false });

  const videos = (data ?? []) as Video[];

  return (
    <div>
      <PageHeader title="Videos" description="Every rendered 9:16 ad. Preview, edit captions, or queue to post." />
      {videos.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No videos rendered yet"
          description="Generate a strategy or campaign, pick a concept, and the render worker will produce a vertical ad here."
          actionLabel="Go to products"
          actionHref="/products"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {videos.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className="grid aspect-[9/16] place-items-center bg-ink-800 text-ink-600">
                <Clapperboard className="h-8 w-8" />
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="truncate text-xs">{v.title ?? "Untitled"}</span>
                <Badge tone={statusTone(v.status)}>{humanize(v.status)}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
