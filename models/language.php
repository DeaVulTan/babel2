<?php

/**
 *  @Persist(languages)
 */
class Language
{
    use ActiveMongo2\Query;

    /** @Id */
    public $id;

    /** @String */
    public $name;

    /** @String @Unique */
    public $code;

    /** @String */
    public $englishName;
}
