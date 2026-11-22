import type { Dispatch, FormEvent, SetStateAction } from 'react';
type Props = {
    join: (event: FormEvent) => Promise<void>;
    code: string;
    setCode: Dispatch<SetStateAction<string>>;
};
export function JoinCampaignForm({ join, code, setCode }: Props) {
    return <form className="panel" onSubmit={join}><div className="panel-icon">♜</div><h3>Join a party</h3><p>Have a code from your Game Master? Enter it below.</p><label>Lobby code<input aria-label="Invite code" placeholder="A1B2C3D4" value={code} onChange={e => setCode(e.target.value)} required maxLength={40}/></label><button className="primary">Join campaign →</button></form>;
}
