import { PageHeader } from "@/components/dashboard/page-header";
import { ProductInputForm } from "@/components/products/product-input-form";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add a product"
        description="Paste a link, upload media, or describe it. The AI will analyze it next."
      />
      <ProductInputForm />
    </div>
  );
}
