import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl w-full px-6 py-10">
        <h1 className="font-display text-4xl text-stone-900">
          Page not found
        </h1>
        <p className="text-stone-700 mt-3">
          That page does not exist, or the agency it pointed to was renamed
          or removed from the dataset.
        </p>
        <p className="text-stone-700 mt-6">
          <Link href="/" className="underline hover:text-stone-900">
            Back to the home page
          </Link>{" "}
          or browse{" "}
          <Link href="/agencies" className="underline hover:text-stone-900">
            every agency
          </Link>
          .
        </p>
      </div>
    </SiteShell>
  );
}
