import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const html2canvas = vi.fn();
  const pdfInstances: Array<{
    options: unknown;
    addImage: ReturnType<typeof vi.fn>;
    addPage: ReturnType<typeof vi.fn>;
    output: ReturnType<typeof vi.fn>;
  }> = [];

  class FakePdf {
    options: unknown;
    addImage = vi.fn();
    addPage = vi.fn();
    output = vi.fn(() => new Blob(["pdf"], { type: "application/pdf" }));
    internal = {
      pageSize: {
        getWidth: () => 841.89,
        getHeight: () => 595.28,
      },
    };

    constructor(options: unknown) {
      this.options = options;
      pdfInstances.push(this);
    }
  }

  return { html2canvas, pdfInstances, FakePdf };
});

vi.mock("html2canvas-pro", () => ({ default: mocks.html2canvas }));
vi.mock("jspdf", () => ({ jsPDF: mocks.FakePdf }));

import {
  PROJECT_REPORT_EXPORT_ERROR,
  exportProjectReportPdf,
  runProjectReportExport,
} from "./exportProjectReport";

type FakePage = { id: string; scrollHeight: number };

function installBrowserStubs() {
  const pages: FakePage[] = [
    { id: "summary", scrollHeight: 420 },
    { id: "details", scrollHeight: 510 },
  ];
  const targetStyle = { width: "", minWidth: "", maxWidth: "" };
  const target = {
    style: targetStyle,
    querySelectorAll: vi.fn(() => pages),
  };
  const clickedDownloads: string[] = [];
  const removedLinks: string[] = [];
  const revokedUrls: string[] = [];

  const makeCanvas = (id = "header") => ({
    width: 2240,
    height: id === "summary" ? 840 : id === "details" ? 1020 : 128,
    getContext: () => ({
      scale: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
    }),
    toDataURL: (type?: string) => `data:${type ?? "image/png"};base64,${id}`,
  });

  mocks.html2canvas.mockImplementation(async (page: FakePage) => makeCanvas(page.id));

  vi.stubGlobal("document", {
    fonts: { ready: Promise.resolve() },
    getElementById: vi.fn(() => target),
    createElement: vi.fn((tag: string) => {
      if (tag === "canvas") return makeCanvas();
      if (tag === "a") {
        const link = {
          href: "",
          download: "",
          style: { display: "" },
          click: () => clickedDownloads.push(link.download),
          remove: () => removedLinks.push(link.download),
        };
        return link;
      }
      throw new Error(`Unexpected element: ${tag}`);
    }),
    body: { appendChild: vi.fn() },
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:project-report"),
    revokeObjectURL: vi.fn((url: string) => revokedUrls.push(url)),
  });
  vi.stubGlobal("window", {
    setTimeout: (callback: () => void) => {
      callback();
      return 1;
    },
  });
  vi.stubGlobal("setTimeout", (callback: () => void) => {
    callback();
    return 1;
  });

  return { pages, targetStyle, clickedDownloads, removedLinks, revokedUrls };
}

describe("exportProjectReportPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pdfInstances.length = 0;
  });

  it("downloads a project/month-named landscape A4 PDF with one report row per page", async () => {
    const browser = installBrowserStubs();

    await exportProjectReportPdf({
      elementId: "project-report-capture",
      projectName: "DECV / Sample",
      reportYear: 2026,
      reportMonth: 10,
    });

    expect(mocks.html2canvas).toHaveBeenCalledTimes(2);
    expect(mocks.html2canvas.mock.calls.map(([page]) => page.id)).toEqual([
      "summary",
      "details",
    ]);

    const pdf = mocks.pdfInstances[0];
    expect(pdf.options).toEqual({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    expect(pdf.addPage).toHaveBeenCalledTimes(1);
    expect(pdf.addImage).toHaveBeenCalledTimes(4);
    expect(
      pdf.addImage.mock.calls.filter(([, format]) => format === "JPEG").map(([image]) => image),
    ).toEqual([
      "data:image/jpeg;base64,summary",
      "data:image/jpeg;base64,details",
    ]);
    expect(pdf.output).toHaveBeenCalledWith("blob");
    expect(browser.clickedDownloads).toEqual([
      "DECV___Sample_당월보고서_2026_10.pdf",
    ]);
    expect(browser.removedLinks).toEqual(browser.clickedDownloads);
    expect(browser.revokedUrls).toEqual(["blob:project-report"]);
    expect(browser.targetStyle).toEqual({ width: "", minWidth: "", maxWidth: "" });
  });
});

describe("runProjectReportExport", () => {
  it("restores the button state and exposes the user-facing error after export failure", async () => {
    const exportingStates: boolean[] = [];
    const errors: Array<string | null> = [];
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await runProjectReportExport({
      exportAction: async () => {
        throw new Error("capture failed");
      },
      setExporting: (value) => exportingStates.push(value),
      setError: (value) => errors.push(value),
    });

    expect(exportingStates).toEqual([true, false]);
    expect(errors).toEqual([null, PROJECT_REPORT_EXPORT_ERROR]);
  });
});