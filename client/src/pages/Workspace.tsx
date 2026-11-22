import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { sections } from './workspace/types';
import type { CampaignState, Item, Section } from './workspace/types';
import { OverviewPanel } from './workspace/OverviewPanel';
import { ResourcePanel } from './workspace/ResourcePanel';
import { DicePanel } from './workspace/DicePanel';
export default function Workspace() {
    const { id = '' } = useParams();
    const [characterFields, setCharacterFields] = useState<Partial<Item>>({}), [hpAmount, setHpAmount] = useState(1), [token, setToken] = useState(''), [campaign, setCampaign] = useState<CampaignState | null>(null), [section, setSection] = useState<Section>('overview'), [error, setError] = useState(''), [name, setName] = useState(''), [details, setDetails] = useState(''), [privateItem, setPrivateItem] = useState(false), [editing, setEditing] = useState<Item | null>(null), [count, setCount] = useState(1), [sides, setSides] = useState(20), [bonus, setBonus] = useState(0), [lastRoll, setLastRoll] = useState<{
        rolls: number[];
        sides: number;
        total: number;
    } | null>(null);
    useEffect(() => { const handler = (e: Event) => { const tab = (e as CustomEvent<string>).detail; if (sections.includes(tab as Section))
        setSection(tab as Section); }; window.addEventListener('ck-tab', handler); return () => window.removeEventListener('ck-tab', handler); }, []);
    useEffect(() => { let live = true; let stream: EventSource | undefined; api.openCampaign(id).then(session => { if (!live)
        return; setToken(session.token); const load = async () => { const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, { headers: { 'x-player-token': session.token } }); if (!response.ok)
        throw Error('Could not open campaign'); const result = await response.json(); if (live)
        setCampaign(result); }; load().catch(e => setError(e.message)); stream = new EventSource(`/api/campaigns/${encodeURIComponent(id)}/stream?token=${encodeURIComponent(session.token)}`); stream.addEventListener('update', event => { if (live)
        setCampaign(JSON.parse((event as MessageEvent).data)); }); stream.onerror = () => { if (live)
        setError('Live updates disconnected. Refresh if changes stop appearing.'); }; }).catch(e => setError(e.message)); return () => { live = false; stream?.close(); }; }, [id]);
    async function call(path: string, method = 'POST', body?: unknown) { setError(''); const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}${path}`, { method, headers: { 'Content-Type': 'application/json', 'x-player-token': token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw Error(result.error || `Request failed: ${response.status}`);
    } if (response.status === 204)
        return null; return response.json(); }
    async function act(path: string, method = 'POST', body?: unknown) { try {
        const result = await call(path, method, body);
        if (result?.members)
            setCampaign(result);
        return result;
    }
    catch (e) {
        setError((e as Error).message);
        return null;
    } }
    const gm = campaign?.me.role === 'gm';
    const currentMember = campaign?.members.find(m => m.id === campaign.me.id);
    async function submit(e: FormEvent) { e.preventDefault(); const type = section; const body = type === 'characters' ? { ...characterFields, name, className: details, private: privateItem } : type === 'notes' ? { title: name, content: details, private: privateItem } : type === 'events' ? { title: name, description: details, date: editing?.date || '', private: privateItem } : { title: name, description: details, status: editing?.status || 'open', private: privateItem }; const path = `/${type}${editing ? `/${editing.id}` : ''}`; const result = await act(path, editing ? 'PATCH' : 'POST', body); if (result) {
        setName('');
        setDetails('');
        setEditing(null);
        setCharacterFields({});
        setPrivateItem(false);
    } }
    function edit(item: Item) { setCharacterFields(item); setEditing(item); setName(item.name || item.title || ''); setDetails(section === 'notes' ? item.content || '' : section === 'characters' ? item.className || '' : item.description || ''); setPrivateItem(!!item.private); }
    async function exportBackup() { try {
        const response = await fetch(`/api/campaigns/${id}/export`, { headers: { 'x-player-token': token } });
        if (!response.ok)
            throw Error('Could not export campaign');
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = 'campaign-backup.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    catch (e) {
        setError((e as Error).message);
    } }
    async function importCharacter(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        try {
            const data = JSON.parse(await file.text());
            const result = await call('/characters/import', 'POST', data);
            if (result) {
                setError('');
                const latest = await call('', 'GET');
                setCampaign(latest);
            }
        }
        catch (e) {
            setError((e as Error).message);
        }
        event.target.value = '';
    }
    function downloadCharacter(item: Item) {
        const fields = ['name', 'portrait', 'className', 'level', 'ancestry', 'background', 'alignment', 'hitPoints', 'maxHp', 'currentHp', 'tempHp', 'armorClass', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'inventory', 'abilities', 'description', 'portraitImage'];
        const character = Object.fromEntries(fields.filter(key => item[key as keyof Item] !== undefined).map(key => [key, item[key as keyof Item]]));
        const file = new Blob([JSON.stringify({ format: 'campaign-keeper-character', version: 1, character }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = (item.name || 'character').replace(/[^a-z0-9_-]/gi, '_') + '.json';
        link.click();
        URL.revokeObjectURL(url);
    }
    async function uploadPortrait(item: Item, file?: File) {
        if (!file)
            return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1000000) {
            setError('Use a PNG, JPEG or WebP image smaller than 1 MB');
            return;
        }
        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}/characters/${item.id}/portrait`, { method: 'POST', headers: { 'x-player-token': token, 'Content-Type': file.type }, body: file });
            if (!response.ok) {
                const data = await response.json();
                throw Error(data.error || 'Portrait upload failed');
            }
            setCampaign(await call('', 'GET'));
        }
        catch (e) {
            setError((e as Error).message);
        }
    }
    async function changeHp(item: Item, action: string) {
        const result = await act(`/characters/${item.id}/hp`, 'POST', { action, amount: hpAmount });
        if (result)
            setCampaign(await call('', 'GET'));
    }
    async function roll(e: FormEvent) { e.preventDefault(); const result = await act('/dice', 'POST', { count, sides, bonus }); if (result)
        setLastRoll(result); }
    if (!campaign)
        return <div><Link to="/campaigns">← Campaigns</Link><p>{error || 'Loading campaign...'}</p></div>;
    const items = section === 'characters' ? campaign.characters : section === 'quests' ? campaign.quests : section === 'notes' ? campaign.notes : section === 'events' ? campaign.events : [];
    const canCreate = gm || section === 'characters';
    return <div className="ck-original-screen"><div className="campaign-banner"><div><div className="eyebrow">TABLETOP RPG</div><h2>{campaign.name}</h2><p>Session {campaign.sessionNumber} · {campaign.status}</p></div><div className="code-card"><span>INVITE CODE</span><button onClick={() => navigator.clipboard.writeText(campaign.code)} title="Copy invite code">{campaign.code}</button><small>Click to copy</small></div></div><div className="ck-backup-actions"><Link to="/campaigns">← Switch campaign</Link>{gm && <button className="secondary small" onClick={exportBackup}>Export campaign</button>}</div>{error && <div role="alert" className="alert alert-warning">{error}</div>}<div className="tabs">{sections.map(s => <button key={s} className={section === s ? 'active' : ''} onClick={() => { setSection(s); setEditing(null); setName(''); setDetails(''); }}>{s === 'overview' ? 'Overview' : s === 'dice' ? 'Live session' : s[0].toUpperCase() + s.slice(1)}</button>)}</div>
 {section === 'overview' && <OverviewPanel campaign={campaign} gm={gm} currentMember={currentMember} act={act}/>}
 <ResourcePanel section={section} campaign={campaign} gm={gm} items={items} canCreate={canCreate} name={name} details={details} privateItem={privateItem} editing={editing} characterFields={characterFields} hpAmount={hpAmount} setName={setName} setDetails={setDetails} setPrivateItem={setPrivateItem} setEditing={setEditing} setCharacterFields={setCharacterFields} setHpAmount={setHpAmount} submit={submit} edit={edit} act={act} downloadCharacter={downloadCharacter} uploadPortrait={uploadPortrait} changeHp={changeHp} importCharacter={importCharacter}/>
 <DicePanel section={section} campaign={campaign} count={count} sides={sides} bonus={bonus} lastRoll={lastRoll} setCount={setCount} setSides={setSides} setBonus={setBonus} roll={roll}/>
 </div>;
}
