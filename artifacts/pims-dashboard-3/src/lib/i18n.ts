import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonKo from "../locales/ko/common.json";
import commonEn from "../locales/en/common.json";
import commonVi from "../locales/vi/common.json";
import adminLoginScreenKo from "../locales/ko/adminLoginScreen.json";
import adminLoginScreenEn from "../locales/en/adminLoginScreen.json";
import adminLoginScreenVi from "../locales/vi/adminLoginScreen.json";
import appKo from "../locales/ko/app.json";
import appEn from "../locales/en/app.json";
import appVi from "../locales/vi/app.json";
import cashFlowChartKo from "../locales/ko/cashFlowChart.json";
import cashFlowChartEn from "../locales/en/cashFlowChart.json";
import cashFlowChartVi from "../locales/vi/cashFlowChart.json";
import commentPanelKo from "../locales/ko/commentPanel.json";
import commentPanelEn from "../locales/en/commentPanel.json";
import commentPanelVi from "../locales/vi/commentPanel.json";
import constructionProgressTabKo from "../locales/ko/constructionProgressTab.json";
import constructionProgressTabEn from "../locales/en/constructionProgressTab.json";
import constructionProgressTabVi from "../locales/vi/constructionProgressTab.json";
import costingTabKo from "../locales/ko/costingTab.json";
import costingTabEn from "../locales/en/costingTab.json";
import costingTabVi from "../locales/vi/costingTab.json";
import dashboardKo from "../locales/ko/dashboard.json";
import dashboardEn from "../locales/en/dashboard.json";
import dashboardVi from "../locales/vi/dashboard.json";
import dashboardHeaderKo from "../locales/ko/dashboardHeader.json";
import dashboardHeaderEn from "../locales/en/dashboardHeader.json";
import dashboardHeaderVi from "../locales/vi/dashboardHeader.json";
import drilldownCardKo from "../locales/ko/drilldownCard.json";
import drilldownCardEn from "../locales/en/drilldownCard.json";
import drilldownCardVi from "../locales/vi/drilldownCard.json";
import fxRateEditorKo from "../locales/ko/fxRateEditor.json";
import fxRateEditorEn from "../locales/en/fxRateEditor.json";
import fxRateEditorVi from "../locales/vi/fxRateEditor.json";
import kpiCardsKo from "../locales/ko/kpiCards.json";
import kpiCardsEn from "../locales/en/kpiCards.json";
import kpiCardsVi from "../locales/vi/kpiCards.json";
import mgmtReportUploadModalKo from "../locales/ko/mgmtReportUploadModal.json";
import mgmtReportUploadModalEn from "../locales/en/mgmtReportUploadModal.json";
import mgmtReportUploadModalVi from "../locales/vi/mgmtReportUploadModal.json";
import orderStatusKo from "../locales/ko/orderStatus.json";
import orderStatusEn from "../locales/en/orderStatus.json";
import orderStatusVi from "../locales/vi/orderStatus.json";
import outsourcingTabKo from "../locales/ko/outsourcingTab.json";
import outsourcingTabEn from "../locales/en/outsourcingTab.json";
import outsourcingTabVi from "../locales/vi/outsourcingTab.json";
import overviewTabKo from "../locales/ko/overviewTab.json";
import overviewTabEn from "../locales/en/overviewTab.json";
import overviewTabVi from "../locales/vi/overviewTab.json";
import performanceTableKo from "../locales/ko/performanceTable.json";
import performanceTableEn from "../locales/en/performanceTable.json";
import performanceTableVi from "../locales/vi/performanceTable.json";
import photoPagerKo from "../locales/ko/photoPager.json";
import photoPagerEn from "../locales/en/photoPager.json";
import photoPagerVi from "../locales/vi/photoPager.json";
import profitChartKo from "../locales/ko/profitChart.json";
import profitChartEn from "../locales/en/profitChart.json";
import profitChartVi from "../locales/vi/profitChart.json";
import projectCommentPanelKo from "../locales/ko/projectCommentPanel.json";
import projectCommentPanelEn from "../locales/en/projectCommentPanel.json";
import projectCommentPanelVi from "../locales/vi/projectCommentPanel.json";
import projectDashboardKo from "../locales/ko/projectDashboard.json";
import projectDashboardEn from "../locales/en/projectDashboard.json";
import projectDashboardVi from "../locales/vi/projectDashboard.json";
import projectDataEntryTabKo from "../locales/ko/projectDataEntryTab.json";
import projectDataEntryTabEn from "../locales/en/projectDataEntryTab.json";
import projectDataEntryTabVi from "../locales/vi/projectDataEntryTab.json";
import saleProfitTabKo from "../locales/ko/saleProfitTab.json";
import saleProfitTabEn from "../locales/en/saleProfitTab.json";
import saleProfitTabVi from "../locales/vi/saleProfitTab.json";
import salesChartKo from "../locales/ko/salesChart.json";
import salesChartEn from "../locales/en/salesChart.json";
import salesChartVi from "../locales/vi/salesChart.json";
import serviceBudgetTabKo from "../locales/ko/serviceBudgetTab.json";
import serviceBudgetTabEn from "../locales/en/serviceBudgetTab.json";
import serviceBudgetTabVi from "../locales/vi/serviceBudgetTab.json";
import serviceCashflowTabKo from "../locales/ko/serviceCashflowTab.json";
import serviceCashflowTabEn from "../locales/en/serviceCashflowTab.json";
import serviceCashflowTabVi from "../locales/vi/serviceCashflowTab.json";
import serviceOutsourcingTabKo from "../locales/ko/serviceOutsourcingTab.json";
import serviceOutsourcingTabEn from "../locales/en/serviceOutsourcingTab.json";
import serviceOutsourcingTabVi from "../locales/vi/serviceOutsourcingTab.json";
import serviceProjectDashboardKo from "../locales/ko/serviceProjectDashboard.json";
import serviceProjectDashboardEn from "../locales/en/serviceProjectDashboard.json";
import serviceProjectDashboardVi from "../locales/vi/serviceProjectDashboard.json";
import sidebarKo from "../locales/ko/sidebar.json";
import sidebarEn from "../locales/en/sidebar.json";
import sidebarVi from "../locales/vi/sidebar.json";

export const SUPPORTED_LANGUAGES = ["ko", "en", "vi"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ko: "KO",
  en: "EN",
  vi: "VI",
};

const STORAGE_KEY = "pims-dashboard-lang";

function detectInitialLanguage(): SupportedLanguage {
  const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
    return saved as SupportedLanguage;
  }
  return "ko";
}

const NAMESPACES = [
  "common", "adminLoginScreen", "app", "cashFlowChart", "commentPanel",
  "constructionProgressTab", "costingTab", "dashboard", "dashboardHeader",
  "drilldownCard", "fxRateEditor", "kpiCards", "mgmtReportUploadModal",
  "orderStatus", "outsourcingTab", "overviewTab", "performanceTable",
  "photoPager", "profitChart", "projectCommentPanel", "projectDashboard",
  "projectDataEntryTab", "saleProfitTab", "salesChart", "serviceBudgetTab",
  "serviceCashflowTab", "serviceOutsourcingTab", "serviceProjectDashboard",
  "sidebar",
];

i18n.use(initReactI18next).init({
  lng: detectInitialLanguage(),
  fallbackLng: "ko",
  supportedLngs: SUPPORTED_LANGUAGES,
  defaultNS: "common",
  ns: NAMESPACES,
  resources: {
    ko: { common: commonKo, adminLoginScreen: adminLoginScreenKo, app: appKo, cashFlowChart: cashFlowChartKo, commentPanel: commentPanelKo, constructionProgressTab: constructionProgressTabKo, costingTab: costingTabKo, dashboard: dashboardKo, dashboardHeader: dashboardHeaderKo, drilldownCard: drilldownCardKo, fxRateEditor: fxRateEditorKo, kpiCards: kpiCardsKo, mgmtReportUploadModal: mgmtReportUploadModalKo, orderStatus: orderStatusKo, outsourcingTab: outsourcingTabKo, overviewTab: overviewTabKo, performanceTable: performanceTableKo, photoPager: photoPagerKo, profitChart: profitChartKo, projectCommentPanel: projectCommentPanelKo, projectDashboard: projectDashboardKo, projectDataEntryTab: projectDataEntryTabKo, saleProfitTab: saleProfitTabKo, salesChart: salesChartKo, serviceBudgetTab: serviceBudgetTabKo, serviceCashflowTab: serviceCashflowTabKo, serviceOutsourcingTab: serviceOutsourcingTabKo, serviceProjectDashboard: serviceProjectDashboardKo, sidebar: sidebarKo },
    en: { common: commonEn, adminLoginScreen: adminLoginScreenEn, app: appEn, cashFlowChart: cashFlowChartEn, commentPanel: commentPanelEn, constructionProgressTab: constructionProgressTabEn, costingTab: costingTabEn, dashboard: dashboardEn, dashboardHeader: dashboardHeaderEn, drilldownCard: drilldownCardEn, fxRateEditor: fxRateEditorEn, kpiCards: kpiCardsEn, mgmtReportUploadModal: mgmtReportUploadModalEn, orderStatus: orderStatusEn, outsourcingTab: outsourcingTabEn, overviewTab: overviewTabEn, performanceTable: performanceTableEn, photoPager: photoPagerEn, profitChart: profitChartEn, projectCommentPanel: projectCommentPanelEn, projectDashboard: projectDashboardEn, projectDataEntryTab: projectDataEntryTabEn, saleProfitTab: saleProfitTabEn, salesChart: salesChartEn, serviceBudgetTab: serviceBudgetTabEn, serviceCashflowTab: serviceCashflowTabEn, serviceOutsourcingTab: serviceOutsourcingTabEn, serviceProjectDashboard: serviceProjectDashboardEn, sidebar: sidebarEn },
    vi: { common: commonVi, adminLoginScreen: adminLoginScreenVi, app: appVi, cashFlowChart: cashFlowChartVi, commentPanel: commentPanelVi, constructionProgressTab: constructionProgressTabVi, costingTab: costingTabVi, dashboard: dashboardVi, dashboardHeader: dashboardHeaderVi, drilldownCard: drilldownCardVi, fxRateEditor: fxRateEditorVi, kpiCards: kpiCardsVi, mgmtReportUploadModal: mgmtReportUploadModalVi, orderStatus: orderStatusVi, outsourcingTab: outsourcingTabVi, overviewTab: overviewTabVi, performanceTable: performanceTableVi, photoPager: photoPagerVi, profitChart: profitChartVi, projectCommentPanel: projectCommentPanelVi, projectDashboard: projectDashboardVi, projectDataEntryTab: projectDataEntryTabVi, saleProfitTab: saleProfitTabVi, salesChart: salesChartVi, serviceBudgetTab: serviceBudgetTabVi, serviceCashflowTab: serviceCashflowTabVi, serviceOutsourcingTab: serviceOutsourcingTabVi, serviceProjectDashboard: serviceProjectDashboardVi, sidebar: sidebarVi },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
});

export default i18n;
