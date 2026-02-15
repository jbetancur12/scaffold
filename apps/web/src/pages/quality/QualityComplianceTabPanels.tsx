import { QualityGovernanceTabs } from '@/pages/quality/tabs/QualityGovernanceTabs';
import { QualityOperationsTabs } from '@/pages/quality/tabs/QualityOperationsTabs';
import { QualityPostmarketTabs } from '@/pages/quality/tabs/QualityPostmarketTabs';
import { QualityRegulatoryTabs } from '@/pages/quality/tabs/QualityRegulatoryTabs';
import type { QualityComplianceModel } from '@/pages/quality/tabs/types';

export function QualityComplianceTabPanels({ model }: { model: QualityComplianceModel }) {
  return (
    <>
      <QualityOperationsTabs model={model} />
      <QualityRegulatoryTabs model={model} />
      <QualityPostmarketTabs model={model} />
      <QualityGovernanceTabs model={model} />
    </>
  );
}
