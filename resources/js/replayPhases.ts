import type { Step } from '@mtgreplay/mtgr';
import { ArrowDownToLine, Flag, Moon, Shield, Sparkle, Sparkles, Sunrise, Swords, Zap } from 'lucide-vue-next';
import type { Component } from 'vue';

export type ReplayStepKey =
    | 'Upkeep'
    | 'Draw'
    | 'PreCombatMain'
    | 'BeginCombat'
    | 'DeclareAttackers'
    | 'DeclareBlockers'
    | 'CombatDamage'
    | 'PostCombatMain'
    | 'EndOfTurn';

export type ReplayStep = { key: ReplayStepKey; label: string; icon: Component };

/** The rail's step icons, grouped by phase. */
export const REPLAY_PHASES: ReplayStep[][] = [
    [
        { key: 'Upkeep', label: 'Upkeep', icon: Sunrise },
        { key: 'Draw', label: 'Draw', icon: ArrowDownToLine },
    ],
    [{ key: 'PreCombatMain', label: 'Main 1', icon: Sparkle }],
    [
        { key: 'BeginCombat', label: 'Beginning of combat', icon: Flag },
        { key: 'DeclareAttackers', label: 'Declare attackers', icon: Swords },
        { key: 'DeclareBlockers', label: 'Declare blockers', icon: Shield },
        { key: 'CombatDamage', label: 'Combat damage', icon: Zap },
    ],
    [{ key: 'PostCombatMain', label: 'Main 2', icon: Sparkles }],
    [{ key: 'EndOfTurn', label: 'End of turn', icon: Moon }],
];

export const REPLAY_STEP_ORDER: ReplayStepKey[] = REPLAY_PHASES.flat().map((step) => step.key);

/** The file's twelve steps onto the rail's nine icons: untap shares upkeep's, end of combat shares damage's, cleanup shares end's. */
const STEP_ICONS: Record<Step, ReplayStepKey> = {
    untap: 'Upkeep',
    upkeep: 'Upkeep',
    draw: 'Draw',
    'precombat-main': 'PreCombatMain',
    'beginning-of-combat': 'BeginCombat',
    'declare-attackers': 'DeclareAttackers',
    'declare-blockers': 'DeclareBlockers',
    'combat-damage': 'CombatDamage',
    'end-of-combat': 'CombatDamage',
    'postcombat-main': 'PostCombatMain',
    end: 'EndOfTurn',
    cleanup: 'EndOfTurn',
};

const STEP_LABELS: Partial<Record<Step, string>> = { untap: 'Untap', 'end-of-combat': 'End of combat', cleanup: 'Cleanup' };

export function stepKey(step: Step | null): ReplayStepKey | null {
    return step ? STEP_ICONS[step] : null;
}

/** The step's own name: the rail's label, or the finer name for a step that shares an icon. */
export function stepLabel(step: Step | null): string {
    if (!step) {
        return '';
    }

    return STEP_LABELS[step] ?? REPLAY_PHASES.flat().find((item) => item.key === STEP_ICONS[step])?.label ?? '';
}
