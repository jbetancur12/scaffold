import type { QualityComplianceModel } from './types';
import { QualityAuditTab } from './governance/QualityAuditTab';
import { QualityChangeControlTab } from './governance/QualityChangeControlTab';
import { QualityComplianceDashboardTab } from './governance/QualityComplianceDashboardTab';
import { QualityDocsTab } from './governance/QualityDocsTab';

export function QualityGovernanceTabs({ model }: { model: QualityComplianceModel }) {
  return (
    <>
      <QualityComplianceDashboardTab model={model} />
      <QualityChangeControlTab model={model} />
      <QualityDocsTab model={model} />
      <QualityAuditTab model={model} />
    </>
  );
}
