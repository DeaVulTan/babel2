<?php

/**
 *  @Persist(strings)
 *  @Autoincrement("id")
 */
class Text
{
    use ActiveMongo2\Query;

    /** @Id */
    public $id;

    /** @Index @Array */
    protected $hashes;

    /** @Required */
    protected $text;

    /** @Array */
    protected $revisions = array();

    /** @Array */
    protected $variables;

    /** @Reference("user") */
    protected $verifiedBy;

    /** @String */
    protected $context;

    /** @EmbedMany(Translation) @UniqueBy(lang) */
    protected $translations = array();

    /** @ReferenceMany(Client) @UniqueBy(id) @ */
    protected $clients = array();

    public static function textId($text)
    {
        return substr(sha1(strtolower(preg_replace("/[^A-Za-z0-9]/", "", $text))), 0, 12);
    }

    public function addTranslation($lang, $text)
    {
        $vars = Client::get()->getVariables($text);
        if (!empty($this->variables) && array_diff($this->variables, $vars) !== array()) {
            $vars = array_diff($this->variables, $vars);
            throw new \RuntimeException("$text doesn't have the following variables:" . implode(", ", $vars));
        }
        $translation = new Translation;
        $translation->lang = $lang;
        $translation->text = $text;
        $this->translations[] = $translation;
    }

    /**
     *  @preSave
     */
    public function setHashes()
    {
        $hash = array();
        foreach ($this->revisions as $rev) {
            $hash[] = self::textId($rev->text);
        }
        foreach ($this->translations as $trans) {
            $hash[] = self::textId($trans->text);
        }
        $hash[] = self::textId($this->text);
        $this->hashes = $hash;
    }

    public function __get($name)
    {
        return $this->$name;
    }

    public static function forTranslation($text, $context, &$created = false) {
        $hash   = self::textId($text);
        $object = self::findOne(array('hashes' => $hash));
        if (empty($object)) {
            $object = new self;
            $object->text    = $text;
            $object->context = $context;
            $created = true;
        }
        $object->variables = Client::get()->getVariables($text);
        $object->clients[] = Client::get();

        return $object;
    }

}
