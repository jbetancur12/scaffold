import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { qualitySections, type QualitySection } from '@/constants/mrpNavigation';
import { useQualityCompliance } from '@/hooks/mrp/useQualityCompliance';
import { QualityComplianceTabPanels } from '@/pages/quality/QualityComplianceTabPanels';

const getQualityTabFromPath = (pathname: string): QualitySection => {
    const isLegacyPath = pathname.startsWith('/mrp/quality/') || pathname.startsWith('/mrp/postmarket/');
    const section = pathname.split('/')[isLegacyPath ? 3 : 2];
    const found = qualitySections.find((option) => option.value === section);
    return found?.value ?? 'nc';
};

export default function QualityCompliancePage({ forcedSection }: { forcedSection?: QualitySection }) {
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = forcedSection ?? getQualityTabFromPath(location.pathname);
    const model = useQualityCompliance();

    const handleTabChange = (value: QualitySection) => {
        if (forcedSection) return;
        const selectedSection = qualitySections.find((section) => section.value === value);
        if (!selectedSection) return;
        if (location.pathname !== selectedSection.path) {
            navigate(selectedSection.path);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Calidad y Cumplimiento</h1>
                <p className="text-slate-500 mt-1">
                    Base regulatoria: No conformidades, CAPA y auditoria de acciones criticas.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as QualitySection)} className="w-full">
                {!forcedSection ? (
                    <div className="md:hidden mb-3">
                        <Select value={activeTab} onValueChange={(value) => handleTabChange(value as QualitySection)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un modulo" />
                            </SelectTrigger>
                            <SelectContent>
                                {qualitySections.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

                <QualityComplianceTabPanels model={model} />
            </Tabs>
        </div>
    );
}
