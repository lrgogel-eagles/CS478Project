import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import type { CampaignState, Item, Section } from './types';
type Props = {
    section: Section;
    campaign: CampaignState;
    gm: boolean;
    items: Item[];
    canCreate: boolean;
    name: string;
    details: string;
    privateItem: boolean;
    editing: Item | null;
    characterFields: Partial<Item>;
    hpAmount: number;
    setName: Dispatch<SetStateAction<string>>;
    setDetails: Dispatch<SetStateAction<string>>;
    setPrivateItem: Dispatch<SetStateAction<boolean>>;
    setEditing: Dispatch<SetStateAction<Item | null>>;
    setCharacterFields: Dispatch<SetStateAction<Partial<Item>>>;
    setHpAmount: Dispatch<SetStateAction<number>>;
    submit: (event: FormEvent) => Promise<void>;
    edit: (item: Item) => void;
    act: (path: string, method?: string, body?: unknown) => Promise<any>;
    downloadCharacter: (item: Item) => void;
    uploadPortrait: (item: Item, file?: File) => Promise<void>;
    changeHp: (item: Item, action: string) => Promise<void>;
    importCharacter: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};
export function ResourcePanel(props: Props) {
    const { section, campaign, gm, items, canCreate, name, details, privateItem, editing, characterFields, hpAmount, setName, setDetails, setPrivateItem, setEditing, setCharacterFields, setHpAmount, submit, edit, act, downloadCharacter, uploadPortrait, changeHp, importCharacter } = props;
    return <>{(['characters', 'quests', 'notes', 'events'] as Section[]).includes(section) && <div className="panel"><div className="section-title"><h3>{section[0].toUpperCase() + section.slice(1)}</h3></div>{items.map(item => <div className="item" key={item.id}>{section === 'characters' && item.portraitImage && <img src={item.portraitImage} alt={item.name || 'Character portrait'} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, marginRight: 12 }}/>}<strong>{item.name || item.title}</strong>{item.private && <span className="ms-2 badge bg-secondary">GM only</span>}<p className="mb-1">{section === 'notes' ? item.content : section === 'characters' ? `${item.className || 'Adventurer'} · Level ${item.level || 1} · HP ${item.currentHp ?? 10}/${item.maxHp ?? 10} · Temporary HP ${item.tempHp ?? 0}` : item.description}</p>{section === 'characters' && <div className="small-muted mt-2">{(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map(stat => <span key={stat} className="me-2">{stat.slice(0, 3).toUpperCase()}: {item[stat] ?? 10}</span>)}</div>}{section === 'characters' && <button className="btn btn-sm btn-outline-info mt-2 me-2" onClick={() => downloadCharacter(item)}>Export JSON</button>}{(gm || (section === 'characters' && item.ownerId === campaign.me.id)) && <div className="d-flex gap-2 flex-wrap mt-2">{section === 'characters' && <><label className="btn btn-sm btn-outline-light">Portrait<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => uploadPortrait(item, e.target.files?.[0])}/></label><input className="form-control form-control-sm" style={{ width: 80 }} type="number" min="0" value={hpAmount} onChange={e => setHpAmount(Number(e.target.value))}/>{(['damage', 'heal', 'temp'] as const).map(action => <button key={action} className="btn btn-sm btn-outline-warning" onClick={() => changeHp(item, action)}>{action}</button>)}</>}<button className="btn btn-sm btn-outline-light" onClick={() => edit(item)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => act(`/${section}/${item.id}`, 'DELETE')}>Delete</button></div>}</div>)}{!items.length && <p>No entries yet.</p>}{section === 'characters' && <label className="btn btn-outline-info mt-3">Import character JSON<input type="file" accept=".json,application/json" hidden onChange={importCharacter}/></label>}{canCreate && <form className="mt-3" onSubmit={submit}><h3 className="h5">{editing ? 'Edit' : 'Add'} {section.slice(0, -1)}</h3><input className="form-control mb-2" placeholder={section === 'characters' ? 'Character name' : 'Title'} aria-label="Name or title" value={name} onChange={e => setName(e.target.value)} required/><textarea className="form-control mb-2" placeholder={section === 'characters' ? 'Class' : 'Description or notes'} aria-label="Details" value={details} onChange={e => setDetails(e.target.value)}/>{section === 'characters' && <div className="row g-2 mb-3">{(['level', 'maxHp', 'currentHp', 'tempHp', 'armorClass', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map(field => <label key={field} className="col-6 col-md-3 text-capitalize">{field}<input className="form-control" type="number" min={field === 'level' ? 1 : 0} value={characterFields[field] ?? (field === 'level' ? 1 : field === 'maxHp' || field === 'currentHp' ? 10 : field === 'speed' ? 30 : ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(field) ? 10 : 0)} onChange={e => setCharacterFields(prev => ({ ...prev, [field]: Number(e.target.value) }))}/></label>)}{(['ancestry', 'background', 'alignment', 'inventory', 'abilities', 'description'] as const).map(field => <label key={field} className="col-md-6 text-capitalize">{field}<input className="form-control" value={characterFields[field] ?? ''} onChange={e => setCharacterFields(prev => ({ ...prev, [field]: e.target.value }))}/></label>)}</div>}{gm && <label className="d-block mb-2"><input type="checkbox" checked={privateItem} onChange={e => setPrivateItem(e.target.checked)}/> GM only</label>}<button className="btn btn-primary">{editing ? 'Save' : 'Add'}</button>{editing && <button type="button" className="btn btn-outline-light ms-2" onClick={() => { setEditing(null); setName(''); setDetails(''); }}>Cancel</button>}</form>}</div>}</>;
}
