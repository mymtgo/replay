import type { Choice, Id, ObjectKind, Player, StatementLine, Step, Target } from '@mtgreplay/mtgr';

/**
 * The view model the components render. Everything here is derived from the
 * parser's replay state (`GameState`) and the game's body lines; the
 * components never read the parser's types directly.
 */

/** The image a host resolves for a card name, and for the face of a double-faced card. Null when it has none. */
export type CardImageResolver = (name: string, face?: string) => string | null;

/** The zones a player's HUD can open as windows. */
export type ReplayZone = 'Hand' | 'Graveyard' | 'Exile' | 'Sideboard';

/** An object as the board draws it: a card, token, copy, emblem, or an ability on the stack. */
export type ReplayCardView = {
    /** The parser's id key (`#12`), unique within the game. */
    key: string;
    id: Id;
    kind: ObjectKind;
    /** Null for a card nobody has seen the face of. */
    name: string | null;
    /** The face showing when it is not the front, after a transform or a cast of the back face. */
    face: string | null;
    image: string | null;
    /** Ability, effect or emblem text. */
    text: string | null;
    /** The card an ability or effect comes from. */
    sourceName: string | null;
    owner: Player;
    controller: Player;
    tapped: boolean;
    power: number | null;
    toughness: number | null;
    counters: Record<string, number>;
    /** Key of the permanent this is attached to. */
    attachedTo: string | null;
    /** Key of the permanent this is exiled with. */
    exiledWith: string | null;
    /** Who or what this creature attacks this combat. */
    attacking: string | null;
    /** Key of the attacker this creature blocks this combat. */
    blocking: string | null;
    /** Damage marked on it this turn. */
    damage: number;
    /** Choices recorded since it was last put on the stack: modes, targets, X, kicker and the rest. */
    choices: readonly Choice[];
};

export type ReplayPlayerView = {
    /** The player's name in the file, which is also their id. */
    id: Player;
    name: Player;
    /** The player the game is recorded from (the `Perspective` tag). */
    local: boolean;
    life: number;
    poison: number;
    counters: Record<string, number>;
    handCount: number;
    librarySize: number;
    /** Mana in the pool by type, in WUBRGC order. */
    pool: Record<string, number>;
    /** Time left on the chess clock in milliseconds, when the file records one. */
    clock: number | null;
    archetype: string | null;
};

/** An object on the stack with what the file says about it. */
export type ReplayStackItem = {
    card: ReplayCardView;
    /** Spell name, or the ability's source name. */
    title: string;
    /** Ability or effect text; null for a spell. */
    text: string | null;
    controller: Player;
    targets: string[];
    /** Cards chosen while it resolves (Thoughtseize's pick), which are not targets. Hidden cards are left out: "a face-down card" tells nobody anything. */
    chosen: ReplayChosenCard[];
    /** Every other choice, worded; a choice of a player, colour or the like reads "Chose ...". */
    choices: string[];
};

export type ReplayChosenCard = { name: string; card: ReplayCardView | null };

/** A lasting effect or an emblem in play. */
export type ReplayEffectView = {
    key: string;
    kind: 'effect' | 'emblem';
    sourceName: string | null;
    text: string | null;
    controller: Player;
};

/** One of the body lines the scrubber visits. */
export type ReplayMoment = {
    /** Index into `replay(game)`'s steps, which is also the index into `game.body`: the moment's last line, so the state is the one after the whole moment. */
    index: number;
    /** The moment's first line. */
    line: StatementLine;
    /** Every line of the moment with its body index; more than one when atomic lines were merged. */
    members: { index: number; line: StatementLine }[];
    /** Seconds since the game started. */
    time: number;
    /** Whether the log lists it: priority, passes and step lines move the board but say nothing. */
    logged: boolean;
};

export type ReplayTurn = {
    /** The file's turn number, which counts every player's turns together. Null for the pregame. */
    number: number | null;
    /** How many turns this player has had by the end of this one: the number the players themselves count. Null for the pregame. */
    playerTurn: number | null;
    /** First moment of the turn. */
    from: number;
    /** Exclusive end moment. */
    to: number;
    /** Active player; null for the pregame. */
    player: Player | null;
};

export type ReplayCauseView = {
    text: string;
    /** The object that caused it, when one did, so the log can link to it. */
    objectKey: string | null;
};

export type ReplayLogItem = {
    key: number;
    kind: 'header' | 'line';
    timestamp: string;
    text: string;
    /** The moment the row belongs to. */
    step: number;
    player: Player | null;
    cause: ReplayCauseView | null;
    /** The object the line is about, for hover previews. */
    objectKey: string | null;
};

/** What a game's lines settle to at one moment, beyond what `GameState` holds. */
export type ReplayDerived = {
    step: Step | null;
    priority: Player | null;
    /** The turn's player, from the `turn` line. */
    active: Player | null;
    /** Attackers by key and what they attack. */
    attacking: ReadonlyMap<string, Target>;
    /** Blockers by key and the attacker's key. */
    blocking: ReadonlyMap<string, string>;
    /** Damage marked on objects this turn, by key. */
    damage: ReadonlyMap<string, number>;
    /** Latest chess clocks, in seconds. */
    clocks: Readonly<Record<Player, number>>;
};

/** `width` is one face; a double-faced card's preview is two faces wide. */
export type CardPreviewPosition = { left: number; top: number; width: number };

export type ScrubTooltipView = { left: number; bottom: number; title: string; time: string; sub: string };

export type ScrubHover = { frame: number; clientX: number; trackTop: number };

/** One game of the match being replayed: its index in the file and its `Game` tag number. */
export type ReplayMatchGame = { id: number; number: number };
