"""New passwords for the agent, drawn from the system CSPRNG (docs/crypto.md §7.12).

Deliberately narrow: one alphabet, one length, no "memorable" mode. What the agent writes,
no human ever types — it goes straight into the vault.
"""

import secrets

# No ambiguous glyph and no character that a form or a shell would fight over.
ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_.@#%+="
LENGTH = 24
CLASSES = (
    "abcdefghijkmnopqrstuvwxyz",
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "23456789",
    "-_.@#%+=",
)


def new_password(length: int = LENGTH) -> str:
    """At least one character of each class, so a site's own rules cannot refuse it."""
    if length < len(CLASSES) + 8:
        raise ValueError("a rotated password is at least 12 characters")
    while True:
        password = "".join(secrets.choice(ALPHABET) for _ in range(length))
        if all(any(c in klass for c in password) for klass in CLASSES):
            return password
