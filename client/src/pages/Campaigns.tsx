import { CreateCampaignForm } from './campaigns/CreateCampaignForm';
import { JoinCampaignForm } from './campaigns/JoinCampaignForm';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Campaign } from '../api/client';
export default function Campaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]), [name, setName] = useState(''), [host, setHost] = useState(''), [system, setSystem] = useState(''), [description, setDescription] = useState(''), [code, setCode] = useState(''), [message, setMessage] = useState('');
    async function refresh() { try {
        const data = await api.campaigns();
        setCampaigns(Array.isArray(data) ? data : data.campaigns);
    }
    catch (e) {
        setMessage((e as Error).message);
    } }
    useEffect(() => { refresh(); }, []);
    async function create(e: FormEvent) { e.preventDefault(); try {
        const result = await api.createCampaign({ name, host, system, description });
        setName('');
        setHost('');
        setSystem('');
        setDescription('');
        setMessage(`Created ${result.name}. Invite code: ${result.inviteCode}`);
        await refresh();
    }
    catch (e) {
        setMessage((e as Error).message);
    } }
    async function join(e: FormEvent) { e.preventDefault(); try {
        await api.joinCampaign(code);
        setCode('');
        setMessage('Joined campaign');
        await refresh();
    }
    catch (e) {
        setMessage((e as Error).message);
    } }
    async function importBackup(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            if (file.size > 90000)
                throw Error('Backup is too large');
            const backup = JSON.parse(await file.text());
            const result = await api.importCampaign(backup);
            setMessage(`Imported ${result.name}. Invite code: ${result.inviteCode}`);
            await refresh();
        }
        catch (error) {
            setMessage((error as Error).message);
        }
        e.target.value = '';
    }
    return <div className="ck-original-screen"><div className="hero"><div className="eyebrow">WELCOME TO CAMPAIGN KEEPER</div><h2>Every legend begins<br />with a story.</h2><p>Host your own campaign, gather your party, and keep your world organized in one place.</p></div>{message && <div role="status" className="notice">{message}</div>}{campaigns.length > 0 && <section className="panel campaign-list-panel"><h3>Your campaigns</h3><div className="welcome-grid">{campaigns.map(c => <div className="tile" key={c.id}><h3>{c.name}</h3><p>{c.role} · Invite code: <strong>{c.inviteCode}</strong></p><Link className="primary" to={`/campaigns/${c.id}`}>Open campaign →</Link></div>)}</div></section>}<div className="welcome-grid"><CreateCampaignForm create={create} name={name} host={host} system={system} description={description} setName={setName} setHost={setHost} setSystem={setSystem} setDescription={setDescription}/><JoinCampaignForm join={join} code={code} setCode={setCode}/></div><div className="panel backup-panel"><h3>Restore a saved campaign</h3><p>Game Masters can import a campaign JSON backup and create a new lobby.</p><input aria-label="Campaign backup JSON" type="file" accept=".json,application/json" onChange={importBackup}/></div></div>;
}
