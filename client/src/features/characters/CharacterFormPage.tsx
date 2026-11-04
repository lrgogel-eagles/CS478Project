import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorText } from '../../api/http';
import { useAuth } from '../auth/auth-context';
import { useCampaign } from '../campaigns/CampaignLayout';
import { ABILITY_LABELS, signedModifier } from './ability-scores';
import { ABILITIES, CHARACTER_LIMITS, charactersApi, type Ability, type Character, type CharacterFields } from './characters-api';
import './characters.css';

type Draft = {
  name: string;
  race: string;
  charClass: string;
  level: string;
  hitPoints: string;
  gold: string;
  scores: Record<Ability, string>;
};

const BLANK: Draft = {
  name: '',
  race: '',
  charClass: '',
  level: '1',
  hitPoints: '10',
  gold: '0',
  scores: { str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10' },
};

function toDraft(character: Character): Draft {
  return {
    name: character.name,
    race: character.race,
    charClass: character.charClass,
    level: String(character.level),
    hitPoints: String(character.hitPoints),
    gold: String(character.gold),
    scores: {
      str: String(character.abilityScores.str),
      dex: String(character.abilityScores.dex),
      con: String(character.abilityScores.con),
      int: String(character.abilityScores.int),
      wis: String(character.abilityScores.wis),
      cha: String(character.abilityScores.cha),
    },
  };
}

class DraftError extends Error {
  override name = 'DraftError';
}

function readWhole(text: string, label: string, min: number, max: number) {
  const value = Number(text.trim());
  if (text.trim() === '' || !Number.isInteger(value) || value < min || value > max) {
    throw new DraftError(`${label} needs a whole number from ${min} to ${max}.`);
  }
  return value;
}

function toFields(draft: Draft): CharacterFields {
  const name = draft.name.trim();
  if (name === '') throw new DraftError('Give the character a name.');
  const scores = (ability: Ability) => readWhole(draft.scores[ability], ABILITY_LABELS[ability], CHARACTER_LIMITS.scoreMin, CHARACTER_LIMITS.scoreMax);
  return {
    name,
    race: draft.race.trim(),
    charClass: draft.charClass.trim(),
    level: readWhole(draft.level, 'Level', CHARACTER_LIMITS.levelMin, CHARACTER_LIMITS.levelMax),
    hitPoints: readWhole(draft.hitPoints, 'Hit points', CHARACTER_LIMITS.hitPointsMin, CHARACTER_LIMITS.hitPointsMax),
    gold: readWhole(draft.gold, 'Gold', 0, CHARACTER_LIMITS.goldMax),
    abilityScores: { str: scores('str'), dex: scores('dex'), con: scores('con'), int: scores('int'), wis: scores('wis'), cha: scores('cha') },
  };
}

function scorePreview(text: string) {
  const value = Number(text);
  return Number.isInteger(value) && value >= CHARACTER_LIMITS.scoreMin && value <= CHARACTER_LIMITS.scoreMax ? signedModifier(value) : '?';
}

export function CharacterFormPage() {
  const { characterId } = useParams();
  const { membership } = useCampaign();
  const { user } = useAuth();
  const navigate = useNavigate();
  const campaignId = membership.campaign.id;
  const editingId = characterId === undefined ? undefined : Number(characterId);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [isLoading, setIsLoading] = useState(editingId !== undefined);
  const [canEdit, setCanEdit] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const backTo = `/campaigns/${campaignId}#party`;

  useEffect(() => {
    if (editingId === undefined) return;
    let isActive = true;
    charactersApi
      .get(campaignId, editingId)
      .then((character) => {
        if (!isActive) return;
        setDraft(toDraft(character));
        setCanEdit(character.ownerId === user?.id || membership.role === 'GM');
      })
      .catch((caught: unknown) => {
        if (isActive) setError(errorText(caught));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [campaignId, editingId, membership.role, user?.id]);

  function setField(key: Exclude<keyof Draft, 'scores'>, value: string) {
    setDraft((old) => ({ ...old, [key]: value }));
  }

  function setScore(ability: Ability, value: string) {
    setDraft((old) => ({ ...old, scores: { ...old.scores, [ability]: value } }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const fields = toFields(draft);
      setIsSaving(true);
      if (editingId === undefined) await charactersApi.create(campaignId, fields);
      else await charactersApi.update(campaignId, editingId, fields);
      navigate(backTo);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setIsSaving(false);
    }
  }

  const title = editingId === undefined ? 'New character' : 'Edit character';

  return (
    <div className="form-page">
      <h1 className="tape tape-label page-title">{title}</h1>
      {isLoading ? (
        <p className="on-wood-note">Finding the character sheet...</p>
      ) : !canEdit ? (
        <div className="sticky-note lost-note">
          <p role="alert">Only the player who made this character, or the Game Master, can change it.</p>
          <Link className="pencil-link" to={backTo}>
            Back to the table
          </Link>
        </div>
      ) : (
        <form className="sheet sheet-form" onSubmit={save} noValidate>
          <span className="sheet-fastener" aria-hidden="true"></span>
          <div className="sheet-top">
            <div className="field field-name">
              <input
                id="characterName"
                className="pencil-input big"
                value={draft.name}
                maxLength={CHARACTER_LIMITS.name}
                onChange={(event) => setField('name', event.target.value)}
                required
              />
              <label className="field-label" htmlFor="characterName">
                Character name
              </label>
            </div>
            <div className="field">
              <input
                id="characterRace"
                className="pencil-input"
                value={draft.race}
                maxLength={CHARACTER_LIMITS.label}
                onChange={(event) => setField('race', event.target.value)}
              />
              <label className="field-label" htmlFor="characterRace">
                Race
              </label>
            </div>
            <div className="field">
              <input
                id="characterClass"
                className="pencil-input"
                value={draft.charClass}
                maxLength={CHARACTER_LIMITS.label}
                onChange={(event) => setField('charClass', event.target.value)}
              />
              <label className="field-label" htmlFor="characterClass">
                Class
              </label>
            </div>
            <div className="field">
              <input
                id="characterLevel"
                className="pencil-input"
                type="number"
                inputMode="numeric"
                min={CHARACTER_LIMITS.levelMin}
                max={CHARACTER_LIMITS.levelMax}
                value={draft.level}
                onChange={(event) => setField('level', event.target.value)}
              />
              <label className="field-label" htmlFor="characterLevel">
                Level
              </label>
            </div>
          </div>
          <fieldset className="abilities">
            <legend className="visually-hidden">Ability scores</legend>
            {ABILITIES.map((ability) => (
              <div className="ability" key={ability}>
                <label className="field-label" htmlFor={`score-${ability}`}>
                  {ABILITY_LABELS[ability]}
                </label>
                <input
                  id={`score-${ability}`}
                  className="score-input pencil"
                  type="number"
                  inputMode="numeric"
                  min={CHARACTER_LIMITS.scoreMin}
                  max={CHARACTER_LIMITS.scoreMax}
                  value={draft.scores[ability]}
                  onChange={(event) => setScore(ability, event.target.value)}
                />
                <span className="mod" aria-hidden="true">
                  {scorePreview(draft.scores[ability])}
                </span>
              </div>
            ))}
          </fieldset>
          <div className="sheet-bottom">
            <div className="box-stat">
              <label className="field-label" htmlFor="characterHitPoints">
                Hit points
              </label>
              <input
                id="characterHitPoints"
                className="score-input pencil"
                type="number"
                inputMode="numeric"
                min={CHARACTER_LIMITS.hitPointsMin}
                max={CHARACTER_LIMITS.hitPointsMax}
                value={draft.hitPoints}
                onChange={(event) => setField('hitPoints', event.target.value)}
              />
            </div>
            <div className="box-stat">
              <label className="field-label" htmlFor="characterGold">
                Gold
              </label>
              <input
                id="characterGold"
                className="score-input pencil"
                type="number"
                inputMode="numeric"
                min={0}
                max={CHARACTER_LIMITS.goldMax}
                value={draft.gold}
                onChange={(event) => setField('gold', event.target.value)}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="paper-alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="ink-btn" disabled={isSaving}>
              {editingId === undefined ? 'Add to the party' : 'Save the sheet'}
            </button>
            <Link className="pencil-link" to={backTo}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
