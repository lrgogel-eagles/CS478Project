import { Link } from 'react-router-dom';
import { ABILITY_LABELS, characterSummary, signedModifier } from './ability-scores';
import { ABILITIES, type Character } from './characters-api';

type CharacterSheetProps = {
  character: Character;
  playerName: string;
  canEdit: boolean;
};

export function CharacterSheet({ character, playerName, canEdit }: CharacterSheetProps) {
  return (
    <article className="sheet" aria-labelledby={`character-${character.id}`}>
      <span className="sheet-fastener" aria-hidden="true"></span>
      <div className="sheet-top">
        <div className="field field-name">
          <h3 id={`character-${character.id}`} className="pencil big">
            {character.name}
          </h3>
          <span className="field-label">Character name</span>
        </div>
        <div className="field">
          <span className="pencil">{characterSummary(character)}</span>
          <span className="field-label">Class and level</span>
        </div>
        <div className="field">
          <span className="pencil">{playerName}</span>
          <span className="field-label">Player</span>
        </div>
      </div>
      <dl className="abilities">
        {ABILITIES.map((ability) => (
          <div className="ability" key={ability}>
            <dt className="field-label">{ABILITY_LABELS[ability]}</dt>
            <dd className="pencil score">{character.abilityScores[ability]}</dd>
            <dd className="mod">{signedModifier(character.abilityScores[ability])}</dd>
          </div>
        ))}
      </dl>
      <dl className="sheet-bottom">
        <div className="box-stat">
          <dt className="field-label">Hit points</dt>
          <dd className="pencil score">{character.hitPoints}</dd>
        </div>
        <div className="box-stat">
          <dt className="field-label">Gold</dt>
          <dd className="pencil score">{character.gold.toLocaleString('en-US')}</dd>
        </div>
      </dl>
      {canEdit && (
        <Link className="pencil-link sheet-edit" to={`characters/${character.id}`} aria-label={`Edit ${character.name}`}>
          Edit
        </Link>
      )}
    </article>
  );
}
