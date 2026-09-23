<?php

namespace Mymtgo\Replay\Exceptions;

use RuntimeException;

/** The username was still present after redaction, so the snapshot must not be shared. */
class RedactionFailed extends RuntimeException {}
