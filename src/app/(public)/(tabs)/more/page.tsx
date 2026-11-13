import { Logo } from "@/components/layout/logo";
import { pageMetadata } from "@/shared/seo";
import {
  BarChart3,
  ChevronRight,
  FileSearch,
  Mail,
  Info,
  Megaphone,
  MessageCircleQuestion,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Route } from "@/shared/routes";
import { KakaoShareButton } from "@/features/share/kakao-share-button";

export const metadata = pageMetadata({ title: "더보기", path: Route.More });

const CONTACT_EMAIL = "dev.hongyelim@gmail.com";

const MENU = [
  { href: Route.About, label: "분홍 맨홀이 위험한 이유", icon: Info },
  { href: Route.Stats, label: "제보 현황", icon: BarChart3 },
  { href: Route.Lookup, label: "조회번호로 찾기", icon: FileSearch },
  { href: Route.Faq, label: "자주 묻는 질문", icon: MessageCircleQuestion },
  { href: Route.Notices, label: "공지사항", icon: Megaphone },
  { href: Route.Privacy, label: "개인정보처리방침", icon: ShieldCheck },
];

export default function MorePage() {
  return (
    <main className="flex flex-1 flex-col px-4">
      <header className="flex h-14 items-center">
        <Logo />
      </header>
      <Link
        href={Route.Report}
        className="mt-2 flex items-center justify-between rounded-2xl bg-navy px-5 py-5 text-white"
      >
        <div>
          <p className="text-lg leading-snug font-bold">
            <span className="text-primary">작은 제보</span>가
            <br />큰 변화를 만듭니다.
          </p>
          <p className="mt-1.5 text-sm text-white/70">
            함께 만드는 더 안전한 대한민국
          </p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-white/15">
          <ChevronRight className="size-5" />
        </span>
      </Link>
      <KakaoShareButton path={Route.Landing} label="분홍 맨홀 카카오톡으로 알리기" className="mt-3" />
      <ul className="mt-6 mb-6 divide-y">
        {MENU.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 py-4">
              <Icon className="size-5 text-muted-foreground" />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="credits-title" className="mt-auto mb-4 rounded-2xl bg-neutral-50 px-5 py-4">
        <h2 id="credits-title" className="text-sm font-semibold">사이트 제작 정보</h2>
        <p className="mt-1 text-sm text-muted-foreground">피드백, 문의는 여기에 남겨주세요.</p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[분홍 맨홀] 문의")}`}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Mail className="size-4" /> {CONTACT_EMAIL}
        </a>
      </section>
    </main>
  );
}
