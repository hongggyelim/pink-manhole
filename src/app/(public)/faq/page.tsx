import { PageHeader } from "@/components/layout/page-header";
import { pageMetadata } from "@/shared/seo";
import { Route } from "@/shared/routes";

export const metadata = pageMetadata({ title: "자주 묻는 질문", path: Route.Faq, description: "분홍 맨홀 제보 서비스 이용에 대해 자주 묻는 질문과 답변입니다." });

const FAQ = [
  { q: "회원가입이 필요한가요?", a: "아니요. 누구나 회원가입 없이 사진과 위치만으로 제보할 수 있어요." },
  { q: "제보한 내용은 누가 볼 수 있나요?", a: "위치, 주소, 처리 상태는 바로 공개돼요. 사진은 관리자 검토 전까지 흐리게 표시되고, 승인 후 원본이 공개돼요. 제보자의 개인정보는 공개되지 않아요." },
  { q: "이미 제보된 곳인데 또 제보해도 되나요?", a: "네. 같은 장소의 제보가 많을수록 문제의 심각성을 알릴 수 있어요." },
  { q: "제보를 수정하거나 삭제할 수 있나요?", a: "현재는 직접 수정·삭제할 수 없어요. 삭제가 필요하면 조회번호와 함께 문의해주세요." },
  { q: "처리 상태는 무엇을 의미하나요?", a: "검토중(사진 검토 대기) → 등록(검토 완료) → 민원 접수(행정기관에 민원 접수) 순서로 진행돼요. 부적절한 제보는 비공개 처리될 수 있어요." },
  { q: "사진에 사람이나 차량 번호판이 찍혔어요.", a: "개인정보 보호를 위해 얼굴이나 번호판이 보이지 않게 촬영해주세요. 부적절한 사진은 관리자가 비공개 처리해요." },
];

export default function FaqPage() {
  return (
    <main className="pb-10">
      <PageHeader title="자주 묻는 질문" />
      <div className="divide-y px-5">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              <span><span className="mr-1.5 text-primary">Q.</span>{q}</span>
              <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
