<?php

namespace Mymtgo\Replay;

/**
 * The frozen replay of one game, as shared from the desktop app and served
 * by mymtgo.com. Plain arrays on the wire; this class only names the contract.
 */
final class ReplaySnapshot
{
    public const VERSION = 1;

    /** The name every redacted player is shown under. */
    public const REDACTED_NAME = 'Opponent';
}
