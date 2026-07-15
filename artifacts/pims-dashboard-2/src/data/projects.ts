export interface Project {
  code: string;
  name: string;
}

export interface ProjectDivision {
  label: string;
  projects: Project[];
}

export interface ProjectGroup {
  label: string;
  divisions: ProjectDivision[];
}

export const PROJECT_GROUPS: ProjectGroup[] = [
  {
    label: "DECV",
    divisions: [
      {
        label: "용역",
        projects: [
          { code: "2VDNS0124", name: "NHON TRACH NEW TOWN SPC(2024)" },
          { code: "2VDNS0125", name: "NHON TRACH NEW TOWN SPC(2025)" },
          { code: "2VHTS0124", name: "THAI BINH NEW TOWN SPC(2024)" },
          { code: "2VHTS0125", name: "THAI BINH NEW TOWN SPC(2025)" },
          { code: "2VTKS0124", name: "THUONG CAT NEW TOWN SPC(2024)" },
          { code: "VD01NI1", name: "NHON TRACH INFRA SITE" },
          { code: "VH01TI1", name: "THT PHASE 1 VILLA&INFRA SITE" },
          { code: "VH02TA1", name: "THT PHASE 1 H9 APTMENT SITE" },
          { code: "VH03TM1", name: "THT GALLERY HOUSING SITE" },
          { code: "VH04TI1", name: "THT PHASE 2 INFRA SITE" },
          { code: "VH05TV1", name: "THT PHASE 2 K3 VILLA SITE" },
          { code: "VH07TV1", name: "THT PHASE 2 K5&K7 VILLA SITE" },
          { code: "VH10TC1", name: "THT K8HH1 COMPLEX SITE" },
          { code: "VH11TA1", name: "THT K8CT1 APTMENT SITE" },
          { code: "VH15TM1", name: "THT MODEL HOUSE SITE (PHASE 1)" },
          { code: "VH16TM1", name: "THT MODEL HOUSE SITE (PHASE 2)" },
        ],
      },
      {
        label: "시공",
        projects: [
          { code: "2VHT01BD", name: "THAI BINH NEW TOWN SPC(OPEX)" },
          { code: "SITE28", name: "S 28 TEST" },
          { code: "Test11", name: "Test11" },
          { code: "VH01TI5", name: "THT INFRA O&M SITE" },
          { code: "VH01TV5", name: "THT PHASE 1 VILLA O&M" },
          { code: "VH02TA4", name: "THT PHASE 1 H9 APTMENT A/S CENTER" },
          { code: "VH02TA5", name: "THT PHASE 1 H9 APTMENT O&M" },
          { code: "VH02TA7", name: "THT PHASE 1 H9 APARTMENT 5TH-YEAR MAINTENANCE SERVICE" },
          { code: "VH05TV5", name: "THT PHASE 2 K3 VILLA O&M" },
          { code: "VH07TV4", name: "THT PHASE 2 K5&K7 VILLA A/S CENTER" },
          { code: "VH09TT1", name: "THT B1CC4 TEST PILE SITE" },
          { code: "VH10TC6", name: "K8HH1 BROKERAGE" },
          { code: "VH10TT1", name: "THT K8HH1 TEST PILE SITE" },
          { code: "VH11TA2", name: "THT K8CT1 PRECON SERVICE" },
          { code: "VH11TT1", name: "THT K8CT1 TEST PILE SITE" },
          { code: "VH13TT1", name: "THT K2CT1 TEST PILE SITE" },
          { code: "VH14TV5", name: "THT PHASE 1&2 VILLA O&M" },
        ],
      },
    ],
  },
  {
    label: "TCC",
    divisions: [
      {
        label: "자체개발",
        projects: [
          { code: "VH06TC3", name: "THT B3CC1 DESIGN&APPROVAL CONSULTING SERVICE" },
          { code: "VH08TC3", name: "THT PJ DESIGN&APPROVAL CONSULTING SERVICE" },
          { code: "VH09T03", name: "THT B1CC4 DESIGN&APPROVAL CONSULTING SERVICE" },
          { code: "VH09TO3", name: "THT B1CC4 DESIGN&APPROVAL CONSULTING SERVICE" },
          { code: "VH10TC2", name: "THT K8HH1 PRECON SERVICE" },
          { code: "VH11TA3", name: "THT K8CT1 CONSTRUCTION INVESTMENT MANAGING SERVICE" },
          { code: "VH12TC3", name: "THT H1HH1 DESIGN&APPROVAL CONSULTING SERVICE" },
          { code: "VH13TA2", name: "THT K2CT1 PRECON SERVICE" },
          { code: "VH17TZ3", name: "THT PHASE 2 K2 BLOCK CONSTRUCTION COST CONSULTING SERVICE" },
          { code: "VH18TZ3", name: "THT PHASE 2 CIP REPORT CONSULTING SERVICE" },
          { code: "VH19CT2", name: "THT K2HH1 PRECON SERVICE" },
        ],
      },
    ],
  },
  {
    label: "DEHEM",
    divisions: [
      {
        label: "자체개발",
        projects: [
          { code: "1VHGD24", name: "HEAD OFFICE(2024)" },
          { code: "1VHGD25", name: "HEAD OFFICE(2025)" },
          { code: "1VHGD26", name: "HEAD OFFICE(2026)" },
          { code: "XEXP100", name: "Head Office Expenses" },
          { code: "XEXP200", name: "Business Expenses" },
        ],
      },
    ],
  },
];
