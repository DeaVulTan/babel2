<?php

/**
 *  @Persist(users)
 */
class User
{
    use ActiveMongo2\Query;

    /** @Id */
    public $id;

    /** @Email @Required */
    public $email;

    /** @Password @Required */
    public $password;

    /** @Float @Inc */
    public $balance = 0;

    /** @String @Required */
    public $type = 'translator';

    public function isAdmin()
    {
        return $this->type === 'admin';
    }

    public function isEditor()
    {
        return $this->type === 'admin' or $this->type === 'editor';
    }

    public function isDev()
    {
        return $this->type === 'admin' or $this->type === 'dev';
    }

    public function isAccountant()
    {
        return $this->type === 'admin' or $this->type === 'accountant';
    }
}
