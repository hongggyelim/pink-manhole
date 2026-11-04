import { PageHeader } from "@/components/layout/page-header";
import { pageMetadata } from "@/shared/seo";
import { Route } from "@/shared/routes";

export const metadata = pageMetadata({ title: "공지사항", path: Route.Notices });

const NOTICES = [
  {
    date: "2026.11.03",
    title: "분홍 맨홀 서비스를 시작합니다",
    body: "전국의 분홍 맨홀을 함께 찾아주세요. 여러분의 제보가 모여 더 안전한 일상을 만듭니다.",
  },
];

export default function NoticesPage() {
  return (
    <main className="pb-10">
      <PageHeader title="공지사항" />
      <ul className="divide-y px-5">
        {NOTICES.map((n) => (
          <li key={n.title} className="py-4">
            <p className="text-xs text-muted-foreground">{n.date}</p>
            <p className="mt-1 font-semibold">{n.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
