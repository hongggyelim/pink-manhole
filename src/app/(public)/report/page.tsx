import { ReportForm } from "@/features/report-form/report-form";
import { pageMetadata } from "@/shared/seo";
import { Route } from "@/shared/routes";

export const metadata = pageMetadata({ title: "신고하기", path: Route.Report, description: "회원가입 없이 사진과 위치만으로 분홍 맨홀을 제보할 수 있어요." });

export default function ReportPage() {
  return <ReportForm />;
}
