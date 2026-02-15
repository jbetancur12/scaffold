import type { QualityComplianceModel } from './types';
import { QualityBatchReleaseTab } from './operations/QualityBatchReleaseTab';
import { QualityCapaTab } from './operations/QualityCapaTab';
import { QualityDeviationOosTab } from './operations/QualityDeviationOosTab';
import { QualityIncomingTab } from './operations/QualityIncomingTab';
import { QualityNcTab } from './operations/QualityNcTab';

export function QualityOperationsTabs({ model }: { model: QualityComplianceModel }) {
  return (
    <>
      <QualityNcTab model={model} />
      <QualityCapaTab model={model} />
      <QualityDeviationOosTab model={model} />
      <QualityIncomingTab model={model} />
      <QualityBatchReleaseTab model={model} />
    </>
  );
}
