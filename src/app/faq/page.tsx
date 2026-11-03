import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "자주 묻는 질문" };

const FAQ = [
  { q: "회원가입이 필요한가요?", a: "아니요. 누구나 회원가입 없이 사진과 위치만으로 제보할 수 있어요." },
  { q: "제보한 내용은 누가 볼 수 있나요?", a: "모든 제보(사진, 위치, 주소, 처리 상태)는 지도에 바로 공개돼요. 제보자의 개인정보는 공개되지 않아요." },
  { q: "이미 제보된 곳인데 또 제보해도 되나요?", a: "네. 같은 장소의 제보가 많을수록 문제의 심각성을 알릴 수 있어요." },
  { q: "제보를 수정하거나 삭제할 수 있나요?", a: "현재는 직접 수정·삭제할 수 없어요. 삭제가 필요하면 조회번호와 함께 문의해주세요." },
  { q: "처리 상태는 무엇을 의미하나요?", a: "접수 → 확인 중 → 민원 제출 → 처리 완료 순서로 진행되며, 분홍맨홀이 아니거나 부적절한 제보는 반려될 수 있어요." },
  { q: "사진에 사람이나 차량 번호판이 찍혔어요.", a: "개인정보 보호를 위해 얼굴이나 번호판이 보이지 않게 촬영해주세요. 부적절한 사진은 관리자가 숨길 수 있어요." },
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
