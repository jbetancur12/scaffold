import QualityCompliancePage from '@/pages/mrp/QualityCompliancePage';
import type { QualitySection } from '@/constants/mrpNavigation';

const createSectionPage = (section: QualitySection) => {
    return function SectionPage() {
        return <QualityCompliancePage forcedSection={section} />;
    };
};

export const QualityNcPage = createSectionPage('nc');
export const QualityCapaPage = createSectionPage('capa');
export const QualityDeviationsOosPage = createSectionPage('deviations-oos');
export const QualityDhrDmrPage = createSectionPage('dhr-dmr');
export const QualityLabelingPage = createSectionPage('labeling');
export const QualityIncomingPage = createSectionPage('incoming');
export const QualityBatchReleasePage = createSectionPage('batch-release');
export const QualityEquipmentPage = createSectionPage('equipment');
export const QualityInvimaPage = createSectionPage('invima');
export const QualityComplianceDashboardPage = createSectionPage('compliance');
export const QualityAlertsPage = createSectionPage('alerts');
export const QualityChangeControlPage = createSectionPage('change-control');
export const QualityDocsPage = createSectionPage('docs');
export const QualityAuditPage = createSectionPage('audit');

export const PostmarketTechnoPage = createSectionPage('techno');
export const PostmarketRecallPage = createSectionPage('recall');
export const PostmarketShipmentPage = createSectionPage('shipment');
