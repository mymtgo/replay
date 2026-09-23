<?php

namespace Mymtgo\Replay;

/**
 * The replay of one match, every game in it, as shared from the desktop app
 * and served by mymtgo.com. Plain arrays on the wire; this class only names
 * the contract.
 */
final class ReplaySnapshot
{
    public const VERSION = 2;

    /** The name every redacted player is shown under. */
    public const REDACTED_NAME = 'Opponent';
}
