import type { Dispatch, FormEvent, SetStateAction } from 'react';
type Props = {
    create: (event: FormEvent) => Promise<void>;
    name: string;
    host: string;
    system: string;
    description: string;
    setName: Dispatch<SetStateAction<string>>;
    setHost: Dispatch<SetStateAction<string>>;
    setSystem: Dispatch<SetStateAction<string>>;
    setDescription: Dispatch<SetStateAction<string>>;
};
export function CreateCampaignForm({ create, name, host, system, description, setName, setHost, setSystem, setDescription }: Props) {
    return <form className="panel" onSubmit={create}><div className="panel-icon">♛</div><h3>Create a new campaign</h3><p>Fill in the details below to set up a campaign and get a code for players to join.</p><label>Campaign title<input aria-label="Campaign name" placeholder="Enter your campaign title" value={name} onChange={e => setName(e.target.value)} required maxLength={80}/></label><div className="hint">The name players will see when they join.</div><label>Game Master name<input aria-label="Game Master name" placeholder="Enter your name or nickname" value={host} onChange={e => setHost(e.target.value)} required maxLength={40}/></label><div className="hint">This name will appear as the host in the lobby.</div><label>Tabletop game system<input aria-label="Tabletop game system" placeholder="Enter the game system (optional)" value={system} onChange={e => setSystem(e.target.value)} maxLength={60}/></label><div className="hint">For example, D&amp;D 5e, Pathfinder, or your own rules.</div><label>Campaign description<textarea aria-label="Campaign description" rows={3} placeholder="Describe the setting, main story, or goal of the campaign (optional)" value={description} onChange={e => setDescription(e.target.value)} maxLength={500}/></label><button className="primary">Create campaign →</button></form>;
}
