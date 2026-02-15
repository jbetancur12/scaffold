import type { QualityComplianceModel } from './types';
import { QualityAuditTab } from './governance/QualityAuditTab';
import { QualityComplianceDashboardTab } from './governance/QualityComplianceDashboardTab';
import { QualityDocsTab } from './governance/QualityDocsTab';

export function QualityGovernanceTabs({ model }: { model: QualityComplianceModel }) {
  return (
    <>
      <QualityComplianceDashboardTab model={model} />
      <QualityDocsTab model={model} />
      <QualityAuditTab model={model} />
    </>
  );
}
