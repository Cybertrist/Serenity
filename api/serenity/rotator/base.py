"""SiteRotator interface and the transactional rotation (CLAUDE.md rule 6).

    1. new password saved as "pending" in the vault BEFORE touching the site;
    2. the old password is kept;
    3. the site change is verified by logging in again with the new password;
    4. on any failure: roll back (restore the old password on the site if it changed,
       discard the pending one), and report;
    5. when the site's answer to the change is lost (timeout, server error), ask the site which
       password it takes before deciding anything: the pending block is the only copy of the
       new one, and is kept whenever the site may have taken it.

Everything here is independent from the site: a V3 executor plugs a Playwright SiteRotator.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Protocol

from serenity.agent.allowlist import is_allowed


class Step(StrEnum):
    READY = "ready"
    PENDING_SAVED = "pending_saved"
    SITE_CHANGED = "site_changed"
    VERIFIED = "verified"
    COMMITTED = "committed"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"


# Allowed transitions: anything else is a bug and raises.
TRANSITIONS: dict[Step, frozenset[Step]] = {
    Step.READY: frozenset({Step.PENDING_SAVED, Step.FAILED}),
    Step.PENDING_SAVED: frozenset({Step.SITE_CHANGED, Step.ROLLED_BACK, Step.FAILED}),
    Step.SITE_CHANGED: frozenset({Step.VERIFIED, Step.ROLLED_BACK, Step.FAILED}),
    Step.VERIFIED: frozenset({Step.COMMITTED, Step.ROLLED_BACK, Step.FAILED}),
    Step.COMMITTED: frozenset(),
    Step.ROLLED_BACK: frozenset(),
    Step.FAILED: frozenset(),
}


class RotationError(RuntimeError):
    """A rotation step failed. The message is safe to store (never a secret)."""


@dataclass(frozen=True)
class Credentials:
    username: str
    password: str

    def __repr__(self) -> str:
        return f"Credentials(username={self.username!r}, password=<hidden>)"


class SiteRotator(Protocol):
    """One implementation per site (V3), for the domains of allowlist.yaml only."""

    domains: frozenset[str]

    def login(self, credentials: Credentials) -> None:
        """Open a session on the site. Raises RotationError."""

    def change_password(self, current: Credentials, new_password: str) -> None:
        """Change the password on the site. Raises RotationError."""

    def verify(self, credentials: Credentials) -> bool:
        """Log in again from scratch; True if the credentials work."""


class VaultPort(Protocol):
    """What a rotation needs from the vault (agent zone only)."""

    def save_pending(self, new_password: str) -> None:
        """Store the new password as a pending revision; the current one stays active."""

    def commit_pending(self) -> None:
        """Make the pending password the current one (new revision)."""

    def discard_pending(self) -> None:
        """Forget the pending password; the current one is untouched."""


@dataclass
class RotationRun:
    """One transactional rotation. Each step is recorded; transitions are enforced."""

    urls: list[str]
    allowlist: frozenset[str]
    step: Step = Step.READY
    history: list[Step] = field(default_factory=lambda: [Step.READY])
    error: str | None = None

    def _move(self, target: Step) -> None:
        if target not in TRANSITIONS[self.step]:
            raise RotationError(f"invalid transition {self.step} -> {target}")
        self.step = target
        self.history.append(target)

    def execute(
        self, rotator: SiteRotator, vault: VaultPort, current: Credentials, new_password: str
    ) -> Step:
        # Checked by code, before anything else: the site must be allowlisted.
        if not is_allowed(self.urls, self.allowlist) or not is_allowed(self.urls, rotator.domains):
            self.error = "site hors de la liste autorisée"
            self._move(Step.FAILED)
            return self.step
        new = Credentials(current.username, new_password)
        try:
            vault.save_pending(new_password)
        except Exception as exc:  # any vault failure stops before the site is touched
            self.error = f"enregistrement en attente impossible ({type(exc).__name__})"
            self._move(Step.FAILED)
            return self.step
        self._move(Step.PENDING_SAVED)
        try:
            rotator.login(current)
        except RotationError as exc:
            # Refused before any change was asked for: the site still has the old password.
            self.error = str(exc)
            return self._rollback(rotator, vault, current, new, site_changed=False)
        try:
            rotator.change_password(current, new_password)
        except RotationError as exc:
            self.error = str(exc)
            return self._unclear_change(rotator, vault, current, new)
        self._move(Step.SITE_CHANGED)
        if not rotator.verify(new):
            self.error = "la reconnexion avec le nouveau mot de passe a échoué"
            return self._rollback(rotator, vault, current, new, site_changed=True)
        self._move(Step.VERIFIED)
        return self._commit(vault)

    def _unclear_change(
        self, rotator: SiteRotator, vault: VaultPort, current: Credentials, new: Credentials
    ) -> Step:
        """The change failed, or its answer was lost. A timeout or a 5xx says nothing about
        what the site did: it may have saved the new password before failing to answer."""
        if rotator.verify(current):
            # The old password still opens the site: it did not change. A clean rollback.
            return self._rollback(rotator, vault, current, new, site_changed=False)
        if rotator.verify(new):
            # The site took the new password after all: finish the rotation.
            self.error = None
            self._move(Step.SITE_CHANGED)
            self._move(Step.VERIFIED)
            return self._commit(vault)
        # Neither opens it (site down, or a lockout): only a human can tell. Keep both.
        self.error = f"{self.error} ; ni l'ancien ni le nouveau mot de passe ne sont confirmés"
        self._move(Step.FAILED)
        return self.step

    def _commit(self, vault: VaultPort) -> Step:
        try:
            vault.commit_pending()
        except Exception as exc:
            # The site already took the new password: the pending block is the only copy,
            # so it is kept, and the entry is flagged instead of rolled back.
            self.error = f"enregistrement final impossible ({type(exc).__name__})"
            self._move(Step.FAILED)
            return self.step
        self._move(Step.COMMITTED)
        return self.step

    def _rollback(
        self,
        rotator: SiteRotator,
        vault: VaultPort,
        current: Credentials,
        new: Credentials,
        *,
        site_changed: bool,
    ) -> Step:
        if site_changed:
            try:
                # Put the old password back on the site, and check it works.
                rotator.change_password(new, current.password)
                if not rotator.verify(current):
                    raise RotationError("ancien mot de passe non restauré")
            except RotationError as exc:
                # Worst case: the site may use either password. Keep BOTH in the vault
                # (the pending one is not discarded) and ask the user to check by hand.
                self.error = f"{self.error} ; retour arrière incomplet ({exc})"
                self._move(Step.FAILED)
                return self.step
        vault.discard_pending()
        self._move(Step.ROLLED_BACK)
        return self.step
