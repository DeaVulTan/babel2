<?php

/**
 *  @Cli("user:create")
 *  @Prompt("email", "User email", validate=FILTER_VALIDATE_EMAIL) 
 *  @Prompt("password", "Password", secret=True) 
 */
function create_user($input)
{
    $user = new User;
    $user->email = $input->getOption('email');
    $user->password = $input->getOption('password');
    $user->save();
    echo "Created user\n";
}
