import { Building2, CalendarDays, ClipboardList, Landmark, Ruler } from "lucide-react";
import { ADMIN_NAVY, CARD_BORDER, INK_BODY, INK_MUTED, INK_NAVY, POINT_BLUE, STATUS_CLOSED_BG, STATUS_CLOSED_TEXT, STATUS_OPEN_BG, STATUS_OPEN_TEXT, TABLE_HEADER_BG } from "../lib/uiTokens";

type ContextLabels = { client: string; period: string; primary: string; contract: string; referenceMonth: string; closed: string; ongoing: string };

export function ProjectContextBar({
  projectName, businessType, client, period, primaryValue, contractValue, referenceMonth, isClosed, labels,
}: {
  projectName: string; businessType: "시공" | "용역"; client: string | null | undefined;
  period: string | null | undefined; primaryValue: string | null | undefined; contractValue: string;
  referenceMonth?: string | null; isClosed?: boolean; labels: ContextLabels;
}) {
  const statusStyle = isClosed
    ? { backgroundColor: STATUS_CLOSED_BG, color: STATUS_CLOSED_TEXT }
    : { backgroundColor: STATUS_OPEN_BG, color: STATUS_OPEN_TEXT };
  const metaItems = [
    { icon: <Building2 size={14} />, label: labels.client, value: client || "-" },
    { icon: <CalendarDays size={14} />, label: labels.period, value: period || "-" },
    { icon: businessType === "시공" ? <Ruler size={14} /> : <ClipboardList size={14} />, label: labels.primary, value: primaryValue || "-" },
  ];
  return (
    <section aria-label={`${projectName} 프로젝트 현황`} style={{ margin: "8px 10px 0", border: `1px solid ${CARD_BORDER}`, borderRadius: "9px", backgroundColor: "#fff", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: `1px solid ${CARD_BORDER}`, backgroundColor: "#fff", flexWrap: "wrap" }}>
        <div aria-hidden="true" style={{ display: "grid", placeItems: "center", width: "30px", height: "30px", borderRadius: "7px", backgroundColor: TABLE_HEADER_BG, color: POINT_BLUE }}><Landmark size={16} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: businessType === "시공" ? POINT_BLUE : ADMIN_NAVY, backgroundColor: TABLE_HEADER_BG, padding: "3px 7px", borderRadius: "999px", whiteSpace: "nowrap" }}>{businessType}</span>
          <h1 style={{ margin: 0, fontSize: "16px", lineHeight: 1.35, color: INK_NAVY, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName}</h1>
        </div>
        <span style={{ ...statusStyle, marginLeft: "auto", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, whiteSpace: "nowrap" }}>{isClosed ? labels.closed : labels.ongoing}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr)) minmax(185px, 1.1fr)", alignItems: "stretch" }}>
        {metaItems.map((item) => <div key={item.label} style={{ minWidth: 0, padding: "10px 14px", borderRight: `1px solid ${CARD_BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: INK_MUTED, fontSize: "11px", fontWeight: 700 }}>{item.icon}{item.label}</div>
          <div title={item.value} style={{ marginTop: "4px", color: INK_BODY, fontSize: "12px", fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
        </div>)}
        <div style={{ minWidth: 0, padding: "10px 14px", backgroundColor: TABLE_HEADER_BG }}>
          <div style={{ color: INK_MUTED, fontSize: "11px", fontWeight: 700 }}>{labels.contract}</div>
          <div style={{ marginTop: "4px", color: INK_NAVY, fontSize: "15px", fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contractValue}</div>
          {referenceMonth && <div style={{ marginTop: "3px", color: POINT_BLUE, fontSize: "11px", fontWeight: 700 }}>{labels.referenceMonth}: {referenceMonth}</div>}
        </div>
      </div>
    </section>
  );
}