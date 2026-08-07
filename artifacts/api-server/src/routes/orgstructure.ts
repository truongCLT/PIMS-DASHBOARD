import { Router, type IRouter } from "express";
import { db, companiesTable, divisionsTable } from "@workspace/db";
import { GetOrgStructureResponse, PutOrgStructureBody, PutOrgStructureResponse } from "@workspace/api-zod";
import { asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

router.get("/orgstructure", async (req, res) => {
  try {
    const companies = await db.select().from(companiesTable).orderBy(asc(companiesTable.sortOrder));
    const divisions = await db.select().from(divisionsTable).orderBy(asc(divisionsTable.sortOrder));

    const divisionsByCompany = new Map<number, typeof divisions>();
    for (const d of divisions) {
      const arr = divisionsByCompany.get(d.companyId) ?? [];
      arr.push(d);
      divisionsByCompany.set(d.companyId, arr);
    }

    res.json(
      GetOrgStructureResponse.parse({
        companies: companies.map((c) => ({
          id: c.id,
          label: c.label,
          sortOrder: c.sortOrder,
          divisions: (divisionsByCompany.get(c.id) ?? []).map((d) => ({
            id: d.id,
            companyId: d.companyId,
            label: d.label,
            businessType: d.businessType,
            sortOrder: d.sortOrder,
          })),
        })),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "failed to load org structure");
    res.status(500).json({ error: "조직 구조 조회에 실패했습니다." });
  }
});

router.put("/orgstructure", requireAdmin, async (req, res) => {
  const parsed = PutOrgStructureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "조직 구조 데이터가 올바르지 않습니다." });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      await tx.delete(divisionsTable);
      await tx.delete(companiesTable);

      const companies: Array<{ id: number; label: string; sortOrder: number; divisions: Array<{ id: number; companyId: number; label: string; businessType: "시공" | "용역"; sortOrder: number }> }> = [];
      for (const companyInput of parsed.data.companies) {
        const [company] = await tx
          .insert(companiesTable)
          .values({ label: companyInput.label, sortOrder: companyInput.sortOrder })
          .returning();
        const divisions = [];
        for (const divisionInput of companyInput.divisions) {
          const [division] = await tx
            .insert(divisionsTable)
            .values({
              companyId: company.id,
              label: divisionInput.label,
              businessType: divisionInput.businessType,
              sortOrder: divisionInput.sortOrder,
            })
            .returning();
          divisions.push(division);
        }
        companies.push({ ...company, divisions });
      }
      return companies;
    });

    res.json(PutOrgStructureResponse.parse({ companies: result }));
  } catch (err) {
    req.log.error({ err }, "failed to save org structure");
    res.status(500).json({ error: "조직 구조 저장에 실패했습니다." });
  }
});

export default router;
