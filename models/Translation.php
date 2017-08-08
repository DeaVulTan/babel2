<?php

/**
 *  @Embeddable("Translation")
 */
class Translation
{
    /** @Reference(users) */
    public $user;

    /** @String */
    public $lang;

    /** @String @Required */
    public $text;
}

