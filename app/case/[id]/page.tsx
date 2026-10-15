import { CaseView } from "@/components/CaseView";
import { LocalCase } from "@/components/LocalCase";
import { loadSampleCase, SAMPLE_IDS } from "@/lib/cases";

export function generateStaticParams() {
  return SAMPLE_IDS.map((id) => ({ id }));
}

export default async function CasePage({ params }: PageProps<"/case/[id]">) {
  const { id } = await params;
  const sample = loadSampleCase(id);
  if (sample) return <CaseView caseFile={sample} />;
  return <LocalCase id={id} />;
}
