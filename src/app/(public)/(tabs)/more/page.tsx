import { BarChart3, ChevronRight, FileSearch, Info, Megaphone, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export const metadata = { title: "더보기" };

const MENU = [
  { href: "/about", label: "분홍 맨홀이 위험한 이유", icon: Info },
  { href: "/stats", label: "제보 현황", icon: BarChart3 },
  { href: "/lookup", label: "조회번호로 찾기", icon: FileSearch },
  { href: "/faq", label: "자주 묻는 질문", icon: MessageCircleQuestion },
  { href: "/notices", label: "공지사항", icon: Megaphone },
  { href: "/privacy", label: "개인정보처리방침", icon: ShieldCheck },
];

export default function MorePage() {
  return (
    <main className="px-4">
      <header className="flex h-14 items-center">
        <Logo />
      </header>
      <Link href="/about" className="mt-2 flex items-center justify-between rounded-2xl bg-navy px-5 py-5 text-white">
        <div>
          <p className="text-lg leading-snug font-bold">
            <span className="text-primary">작은 제보</span>가
            <br />큰 변화를 만듭니다.
          </p>
          <p className="mt-1.5 text-sm text-white/70">함께 만드는 더 안전한 대한민국</p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-white/15">
          <ChevronRight className="size-5" />
        </span>
      </Link>
      <ul className="mt-4 divide-y">
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
    </main>
  );
}
