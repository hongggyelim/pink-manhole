export function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d).replace(/\.\s?/g, ".").replace(/\.$/, "");
}
