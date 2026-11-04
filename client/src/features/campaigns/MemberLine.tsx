import { useState } from 'react';
import type { Member } from './campaigns-api';

const NAMES_SHOWN = 8;

function memberName(member: Member, currentUserId: number | undefined) {
  const name = member.userId === currentUserId ? `${member.displayName} (you)` : member.displayName;
  return member.role === 'GM' ? `${name}, running it` : name;
}

export function MemberLine({ members, currentUserId }: { members: Member[]; currentUserId: number | undefined }) {
  const [isShowingAll, setIsShowingAll] = useState(false);
  const shown = isShowingAll ? members : members.slice(0, NAMES_SHOWN);
  const hiddenCount = members.length - shown.length;
  return (
    <p className="pencil member-line">
      At the table: {shown.map((member) => memberName(member, currentUserId)).join('; ')}
      {hiddenCount > 0 && (
        <>
          {' '}
          <button type="button" className="pencil-btn" onClick={() => setIsShowingAll(true)}>
            and {hiddenCount} more
          </button>
        </>
      )}
    </p>
  );
}
