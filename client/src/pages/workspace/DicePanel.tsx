import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { CampaignState, Section } from './types';
type Props = {
    section: Section;
    campaign: CampaignState;
    count: number;
    sides: number;
    bonus: number;
    lastRoll: {
        rolls: number[];
        sides: number;
        total: number;
    } | null;
    setCount: Dispatch<SetStateAction<number>>;
    setSides: Dispatch<SetStateAction<number>>;
    setBonus: Dispatch<SetStateAction<number>>;
    roll: (event: FormEvent) => Promise<void>;
};
export function DicePanel({ section, campaign, count, sides, bonus, lastRoll, setCount, setSides, setBonus, roll }: Props) {
    return <>{section === 'dice' && <div className="panel"><div className="section-title"><h3>Dice Roller</h3></div><form onSubmit={roll} className="d-flex gap-2 flex-wrap align-items-end"><label>Count<input type="number" className="form-control" min="1" max="20" value={count} onChange={e => setCount(Number(e.target.value))}/></label><label>Die<select className="form-select" value={sides} onChange={e => setSides(Number(e.target.value))}>{[4, 6, 8, 10, 12, 20, 100].map(n => <option key={n} value={n}>d{n}</option>)}</select></label><label>Bonus<input type="number" className="form-control" value={bonus} onChange={e => setBonus(Number(e.target.value))}/></label><button className="btn btn-primary">Roll</button></form>{lastRoll && <div className="mt-3"><h3>Total: {lastRoll.total}</h3><div className="d-flex flex-wrap">{lastRoll.rolls.map((n, i) => <div className="die" key={`${lastRoll.total}-${lastRoll.rolls.join("-")}-${i}`}><canvas width="148" height="148" className="dice-canvas" data-die3d={lastRoll.sides} data-key={`${i}-${n}`}/><strong>{n}</strong></div>)}</div></div>}<h3 className="h5 mt-4">Roll history</h3>{campaign.activity.filter(a => a.kind === 'dice').slice(-12).reverse().map(a => <p className="item" key={a.id}>{a.message}</p>)}</div>}</>;
}
