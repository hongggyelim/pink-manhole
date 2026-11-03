import { ReportDraftProvider } from "@/features/report-form/report-draft";

export const metadata = { title: "신고하기" };

export default function ReportLayout({ children }: LayoutProps<"/report">) {
  return <ReportDraftProvider>{children}</ReportDraftProvider>;
}
