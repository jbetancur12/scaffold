import type { QualityComplianceModel } from './types';
import { QualityDhrDmrTab } from './regulatory/QualityDhrDmrTab';
import { QualityInvimaTab } from './regulatory/QualityInvimaTab';
import { QualityLabelingTab } from './regulatory/QualityLabelingTab';

export function QualityRegulatoryTabs({ model }: { model: QualityComplianceModel }) {
  return (
    <>
      <QualityInvimaTab model={model} />
      <QualityDhrDmrTab model={model} />
      <QualityLabelingTab model={model} />
    </>
  );
}
