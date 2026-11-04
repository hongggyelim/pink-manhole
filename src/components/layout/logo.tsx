import { MapPin } from "lucide-react";
import Link from "next/link";
import { Route } from "@/shared/routes";

export function Logo() {
  return (
    <Link href={Route.Home} className="flex items-center gap-1.5 text-xl font-extrabold text-navy">
      <MapPin className="size-6 fill-primary text-primary [&>circle]:fill-white [&>circle]:stroke-white" />
      분홍 맨홀
    </Link>
  );
}
