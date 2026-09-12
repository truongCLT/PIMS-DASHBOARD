/**
 * ProjectSummaryTab — 개요 탭 (새 첫 번째 탭)
 *
 * 레이아웃: [현장 사진] | [공사 정보 그룹 1] | [계약 정보 그룹 2]
 * 기준: 첨부 이미지(image_1788587015161.png) 레이아웃 충실 구현
 * 데이터 입력 탭에서 저장한 프로젝트 개요·계약 정보를 표시한다.
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectDetailPhoto } from "@workspace/api-client-react";
import {
  getGetPimsvinaSiterateQueryKey,
  useGetPimsvinaSiterate,
} from "@workspace/api-client-react";
import projectPhoto from "../assets/project-photo.png";
import { PhotoPager } from "./PhotoPager";
import { useProjectDetail } from "../lib/projectDetailData";
import { useMoney } from "../lib/displayUnit";
import {
  cardStyle,
  sectionTitle,
  INK_NAVY,
  INK_MUTED,
  INK_SECONDARY,
  CARD_BORDER,
  DIVIDER,
  POINT_BLUE,
  TABLE_HEADER_BG,
} from "../lib/uiTokens";

const LABEL_COLOR = INK_SECONDARY;
const VALUE_COLOR = INK_NAVY;
const DASH = "-";

// ─── 유틸 ─────────────────────────────────────────────────────────────────

/** 날짜 문자열 → 'YY.MM.DD 형식 */
function fmtDate(d: string | null | undefined): string {
  if (!d) return DASH;
  const s = d.slice(0, 10);
  if (s.length < 10) return DASH;
  return `'${s.slice(2, 4)}.${s.slice(5, 7)}.${s.slice(8, 10)}`;
}

/** 시작일~종료일 개월 수 계산 */
function calcMonths(startDate: string | null | undefined, endDate: string | null | undefined): number | null {
  if (!startDate || !endDate) return null;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return null;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
}

// ─── 단일 정보 행 컴포넌트 ───────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  accent?: boolean; // 강조 행 (도급액 등)
  note?: string;   // 행 우측 소형 메모
}

function InfoRow({ label, value, accent = false, note }: InfoRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr",
        gap: "0 8px",
        alignItems: "baseline",
        padding: "5px 10px",
        borderBottom: `1px solid ${DIVIDER}`,
        backgroundColor: accent ? TABLE_HEADER_BG : undefined,
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: LABEL_COLOR,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "12px",
          fontWeight: accent ? 700 : 500,
          color: accent ? POINT_BLUE : VALUE_COLOR,
          wordBreak: "break-all",
          display: "flex",
          alignItems: "baseline",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        {value === null || value === undefined || value === "" ? (
          <span style={{ color: INK_MUTED }}>{DASH}</span>
        ) : (
          value
        )}
        {note && (
          <span style={{ fontSize: "10px", color: INK_MUTED, fontWeight: 400 }}>({note})</span>
        )}
      </span>
    </div>
  );
}

// ─── 그룹 헤더 ───────────────────────────────────────────────────────────

function GroupHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: "5px 10px 4px",
        backgroundColor: TABLE_HEADER_BG,
        borderBottom: `1px solid ${CARD_BORDER}`,
        borderTop: `1px solid ${CARD_BORDER}`,
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: INK_NAVY,
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ─── 사진 패널 ───────────────────────────────────────────────────────────

function SitePhotoPanel({
  projectName,
  photos,
  slideshowIntervalSeconds = 0,
}: {
  projectName: string;
  photos: ProjectDetailPhoto[];
  slideshowIntervalSeconds?: number;
}) {
  const { t } = useTranslation(["overviewTab"]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [projectName]);

  useEffect(() => {
    if (active >= photos.length && photos.length > 0) setActive(0);
  }, [photos.length, active]);

  const hasPhotos = photos.length > 0;
  const safeIdx = Math.min(active, Math.max(photos.length - 1, 0));
  const src = hasPhotos ? `/api/storage${photos[safeIdx].objectPath}` : projectPhoto;
  const total = hasPhotos ? photos.length : 1;

  return (
    <div
      style={{
        ...cardStyle,
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        minHeight: "260px",
        alignSelf: "stretch",
      }}
    >
      <div style={{ ...sectionTitle, marginBottom: "6px", fontSize: "13px" }}>
        현장 사진
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <PhotoPager
          src={src}
          alt={t("overviewTab:sitePhotoAlt", { projectName })}
          total={total}
          current={hasPhotos ? safeIdx : 0}
          onChange={setActive}
          imgStyle={{ minHeight: "190px", height: "100%", maxHeight: "none" }}
          autoPlayIntervalSeconds={slideshowIntervalSeconds}
        />
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────

export function ProjectSummaryTab({ projectName }: { projectName: string }) {
  const { t } = useTranslation(["projectDashboard", "common"]);
  const { detail, isLoading } = useProjectDetail(projectName);
  const { fmtMoney, unitLabel } = useMoney();

  const ov = detail?.overview ?? null;
  const siteCode = ov?.siteCode ?? null;

  // 현장 환율
  const siteRateParams = { siteCode: siteCode ?? "" };
  const siteRateQuery = useGetPimsvinaSiterate(siteRateParams, {
    query: {
      enabled: !!siteCode,
      queryKey: getGetPimsvinaSiterateQueryKey(siteRateParams),
      staleTime: 5 * 60_000,
    },
  });
  const rateUsd = siteRateQuery.data?.rateUsd ?? null;
  const rateKrw = siteRateQuery.data?.rateKrw ?? null;

  // 날짜 계산
  const startDate = ov?.startDate ?? null;
  const endDate = ov?.endDate ?? null;
  const months = calcMonths(startDate, endDate);
  const periodLabel =
    startDate && endDate
      ? `${fmtDate(startDate)} ~ ${fmtDate(endDate)}`
      : DASH;
  const monthsLabel = months != null ? `${months}개월` : null;

  // 도급액
  const contractAmt = ov?.contractAmount ?? null;
  const contractAmtLabel =
    contractAmt != null
      ? `${fmtMoney(contractAmt)} ${unitLabel}`
      : DASH;

  // 현장 환율 라벨
  const siteRateLabel =
    rateUsd != null
      ? `1 USD = ${rateUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} VND${rateKrw != null ? ` / 1 KRW = ${rateKrw.toLocaleString("en-US", { maximumFractionDigits: 2 })} VND` : ""}`
      : null;

  if (isLoading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: INK_MUTED }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <div
      className="project-summary-grid"
      style={{
        gap: "10px",
        alignItems: "stretch",
        minHeight: "620px",
      }}
    >
      {/* ── 좌: 현장 사진 ── */}
      <SitePhotoPanel
        projectName={projectName}
        photos={detail?.photos ?? []}
        slideshowIntervalSeconds={ov?.slideshowIntervalSeconds ?? 0}
      />

      {/* ── 중: 공사 정보 ── */}
      <div
        style={{
          ...cardStyle,
          padding: 0,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <GroupHeader title="공사 정보" />

        <InfoRow
          label="PJ"
          value={
            siteCode
              ? `${projectName} [${siteCode}]`
              : projectName
          }
        />
        <InfoRow
          label="위치"
          value={ov?.location ?? null}
        />
        <InfoRow
          label={t("projectDashboard:constructionPeriod")}
          value={
            startDate || endDate ? (
              <span>
                {periodLabel}
                {monthsLabel && (
                  <span
                    style={{
                      marginLeft: "6px",
                      fontSize: "11px",
                      color: INK_MUTED,
                      fontWeight: 500,
                    }}
                  >
                    ({monthsLabel})
                  </span>
                )}
              </span>
            ) : null
          }
        />
        <InfoRow label="대지면적" value={ov?.siteArea ?? null} />
        <InfoRow label="연면적" value={ov?.grossFloorArea ?? null} />
        <InfoRow label="용도" value={ov?.purpose ?? null} />
        <InfoRow
          label={t("projectDashboard:constructionScale")}
          value={ov?.scale ?? null}
        />
        <InfoRow label="지분" value={ov?.ownershipStake ?? null} />
        <InfoRow label="파트너사" value={ov?.partnerCompany ?? null} />

      </div>

      {/* ── 우: 계약 정보 ── */}
      <div
        style={{
          ...cardStyle,
          padding: 0,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <GroupHeader title="계약 정보" />

        <InfoRow
          label={t("projectDashboard:client")}
          value={ov?.client ?? null}
        />
        <InfoRow
          label={`${t("common:contractAmount")} (전체)`}
          value={contractAmt != null ? contractAmtLabel : null}
          accent={contractAmt != null}
          note={`계약환율 ${siteRateQuery.isLoading ? "조회 중..." : siteRateLabel ?? "-"}`}
        />
        <InfoRow label="계약방식" value={ov?.contractMethod ?? null} />
        <InfoRow label="수금조건" value={ov?.paymentTerms ?? null} />
        <InfoRow label="하자보증기간" value={ov?.defectWarrantyPeriod ?? null} />
        <InfoRow label="하자보증증권" value={ov?.defectWarrantyBond ?? null} />
        <InfoRow label="선급금" value={ov?.advancePayment ?? null} />
        <InfoRow label="유보금" value={ov?.retention ?? null} />
        <InfoRow label="VE 조건" value={ov?.veTerms ?? null} />
      </div>
    </div>
  );
}
