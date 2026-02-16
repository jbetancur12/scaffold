import type { QualityComplianceModel } from './types';
import { QualityDhrDmrTab } from './regulatory/QualityDhrDmrTab';
import { QualityInvimaTab } from './regulatory/QualityInvimaTab';
import { QualityLabelingTab } from './regulatory/QualityLabelingTab';
import { QualityEquipmentTab } from './regulatory/QualityEquipmentTab';

export function QualityRegulatoryTabs({ model }: { model: QualityComplianceModel }) {
  return (
    <>
      <QualityInvimaTab model={model} />
      <QualityEquipmentTab model={model} />
      <QualityDhrDmrTab model={model} />
      <QualityLabelingTab model={model} />
    </>
  );
}
