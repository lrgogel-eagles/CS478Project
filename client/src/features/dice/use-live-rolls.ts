import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../../api/http';
import { diceApi, DICE_LIMITS, type Roll } from './dice-api';

export const POLL_MS = 4000;

function newestFirst(rolls: Roll[]) {
  return [...rolls].sort((a, b) => b.id - a.id).slice(0, DICE_LIMITS.recentRolls);
}

function merge(fromServer: Roll[], local: Roll[]) {
  const newestOnServer = fromServer.reduce((highest, roll) => Math.max(highest, roll.id), 0);
  return newestFirst([...fromServer, ...local.filter((roll) => roll.id > newestOnServer)]);
}

export function useLiveRolls(campaignId: number) {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    let isActive = true;
    const load = () => {
      if (document.visibilityState === 'hidden') return;
      diceApi
        .recent(campaignId)
        .then((recent) => {
          if (!isActive) return;
          setRolls((old) => merge(recent, old));
          setSyncError('');
        })
        .catch((caught: unknown) => {
          if (isActive) setSyncError(errorText(caught));
        })
        .finally(() => {
          if (isActive) setIsLoading(false);
        });
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      isActive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [campaignId]);

  const addRoll = useCallback((roll: Roll) => {
    setRolls((old) => newestFirst([roll, ...old.filter((entry) => entry.id !== roll.id)]));
  }, []);

  return { rolls, isLoading, syncError, addRoll };
}
