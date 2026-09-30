// Environmental, Social, Governance pages delegate to DataCollection with a fixed category
import DataCollection from './DataCollection';

export const Environmental = () => <DataCollection category="Environmental" />;
export const Social = () => <DataCollection category="Social" />;
export const Governance = () => <DataCollection category="Governance" />;
