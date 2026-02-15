import type { QualityComplianceModel } from './types';
import { QualityRecallTab } from './postmarket/QualityRecallTab';
import { QualityShipmentTab } from './postmarket/QualityShipmentTab';
import { QualityTechnoTab } from './postmarket/QualityTechnoTab';

export function QualityPostmarketTabs({ model }: { model: QualityComplianceModel }) {
  return (
    <>
      <QualityTechnoTab model={model} />
      <QualityRecallTab model={model} />
      <QualityShipmentTab model={model} />
    </>
  );
}
