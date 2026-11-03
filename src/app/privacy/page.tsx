import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "개인정보처리방침" };

// TODO: 운영자 연락처 기입 및 법률 검토 후 확정 (초안)
const SECTIONS = [
  {
    h: "1. 수집하는 정보",
    p: "제보 시 사진, 사용자가 지정한 맨홀 위치(좌표)와 이를 변환한 주소를 수집합니다. 부정 이용 방지를 위해 접속 IP는 복원할 수 없는 형태(해시)로만 저장하며, 브라우저 정보(User-Agent)를 함께 저장합니다.",
  },
  {
    h: "2. 이용 목적",
    p: "분홍맨홀 제보 현황의 공개 및 지도 표시, 행정기관 전달, 도배·스팸 등 부정 이용 방지에 사용합니다.",
  },
  {
    h: "3. 공개 범위",
    p: "사진, 위치, 주소, 제보 일시, 처리 상태는 모든 이용자에게 공개됩니다. IP 해시와 브라우저 정보는 공개되지 않습니다.",
  },
  {
    h: "4. 보관 기간",
    p: "부정 이용 방지 정보(IP 해시, 브라우저 정보)는 수집일로부터 90일 후 삭제합니다. 공개 제보 정보는 서비스 운영 기간 동안 보관합니다.",
  },
  {
    h: "5. 삭제 요청",
    p: "사진에 개인정보가 포함되어 있는 등 삭제가 필요한 경우 조회번호와 함께 문의해주시면 확인 후 조치합니다.",
  },
  {
    h: "6. 사진 메타데이터",
    p: "업로드되는 사진은 기기에서 다시 인코딩되어 촬영 기기 정보, GPS 등 EXIF 메타데이터가 제거된 상태로 저장됩니다.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="pb-10">
      <PageHeader title="개인정보처리방침" />
      <div className="space-y-5 px-5 text-sm leading-relaxed">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="mb-1 font-semibold">{s.h}</h2>
            <p className="text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
