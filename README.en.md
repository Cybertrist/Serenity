<div align="center">

<p>
  <a href="README.md"><img src="docs/langues/fr-off.png" alt="Lire cette page en français" width="150" /></a>
  <img src="docs/langues/en-on.png" alt="English, page shown" width="150" />
</p>

<img src="docs/img/en/banniere.png" alt="Serenity, your password vault hosted at home. An agent watches for breaches and rotates the ones you trust it with." width="100%">

[![CI](https://github.com/Cybertrist/Serenity/actions/workflows/ci.yml/badge.svg)](https://github.com/Cybertrist/Serenity/actions/workflows/ci.yml)

</div>

A **complete, self-hosted** password manager, with its own encrypted vault. No Bitwarden or Vaultwarden underneath: the vault, the API and the clients are written here.

What sets it apart: an **agent** that watches for data breaches and takes care of the passwords you hand over to it. The principle fits in one sentence: not a human in the loop, but a human always kept informed.

<img src="docs/img/bureau-coffre.png" alt="The vault on desktop, in French: entries protected by the master password on one side, those delegated to the agent on the other, and a banner flagging the accounts to watch." width="100%">

<img src="docs/img/en/sections/s01.png" alt="01 The vault" width="100%">

The vault has two zones, and that design choice drives everything else.

<img src="docs/img/en/schemas/coffre.png" alt="Personal zone, zero knowledge: it holds the critical accounts such as the bank or the main mailbox. You alone read them, from a client unlocked by the master password. The agent reads nothing there, it only warns you. The server stores encrypted blocks and nothing else, and without the master password or the recovery kit this zone is lost, which is the point. Agent zone, by explicit delegation: it holds the accounts you hand over one at a time with a confirmation. You and the agent on the server read them, through a separate key kept outside the database. There the agent watches for breaches and rotates the passwords. By default every entry lands in the personal zone." width="100%">

<div align="center">

<img src="docs/img/coffre.png" alt="The vault on mobile, in French" width="24%">
<img src="docs/img/codes.png" alt="The two-factor codes screen, in French" width="24%">
<img src="docs/img/fuites.png" alt="The detected breaches screen, in French" width="24%">
<img src="docs/img/agent.png" alt="The agent screen, in French" width="24%">

</div>

> The screenshots show the interface in French, the only language it ships in.

Under the hood, a single cryptography library, libsodium, and no hand-written primitives. The master password goes through Argon2id to give the master key, which never leaves the device. Entries are encrypted with XChaCha20-Poly1305, with the entry identifier, its zone and its revision as associated data: two encrypted blocks can be neither swapped nor replayed. The full specification lives in [`docs/crypto.md`](docs/crypto.md), in French.

<img src="docs/img/en/sections/s02.png" alt="02 The agent" width="100%">

<img src="docs/img/en/schemas/agent.png" alt="A breach lands: Pwned Passwords flags the password under k-anonymity, it never leaves the device. The agent proposes: it prepares the rotation without triggering anything, and the kill switch is checked before every action. You approve: nothing moves without that gesture. The site changes: new revision pending, the old one kept, a re-login as proof, a rollback if it fails." width="100%">

The proof is asked of the site itself: the old password is refused, the new one opens the door. Nothing is replayed or staged, and `make film` records it against the demo site.

<div align="center">

<img src="docs/img/agent-demo.gif" alt="The agent changing a password on the demo site, end to end" width="90%">

</div>

<img src="docs/img/en/sections/s03.png" alt="03 What V1 does" width="100%">

<img src="docs/img/en/schemas/v1.png" alt="Vault encrypted in the browser, with Argon2id for derivation, XChaCha20-Poly1305 for the entries and a recovery kit shown exactly once. Installable app as a PWA, light or dark theme, designed for mobile first. Import from what you have: Google passwords as CSV, Authenticator codes or a Bitwarden export, encrypted on the spot. Breach watch through Pwned Passwords under k-anonymity, plus detection of reused, weak or ageing passwords. Two-factor codes computed in the browser, offline included. Real rotation in an isolated container, one recipe per site, a transaction that serves the vault before the site. Home-made notifications, with no third-party service. restic backup nightly, with a restore drill replayed in continuous integration." width="100%">

A kill switch stops the agent immediately, and it is checked before every action, not only at launch.

Next comes the native Android app with notifications in V2, then rotation on real sites in V3, with one recipe per site and a browser extension.

<div align="center">

<img src="docs/img/clair-coffre.png" alt="The same vault in light theme, in French" width="49%">
<img src="docs/img/connexion.png" alt="The login screen, in French" width="49%">

</div>

<img src="docs/img/en/sections/s04.png" alt="04 In numbers" width="100%">

As of 20 September 2026, ahead of `v0.1.0`.

<img src="docs/img/en/schemas/chiffres.png" alt="Tests: 163 on the Python side, 43 on the TypeScript side, 14 end-to-end journeys played against the real server. Continuous integration: 8 jobs per pull request, including a browser walking every screen and a throwaway vault genuinely destroyed then restored. Code: about 9,900 lines of Python and 9,600 of TypeScript. Cryptography: a single library, libsodium, and test vectors that both Python and TypeScript have to satisfy. Documentation: 11 phase pages, 17 architecture decisions, a 600-line cryptographic specification, a changelog. Status: version 0.1.0 approaching, no external audit to date." width="100%">

<img src="docs/img/en/sections/s05.png" alt="05 Installation" width="100%">

```bash
git clone git@github.com:Cybertrist/Serenity.git
cd Serenity
cp .env.example .env   # then fill in the values
make init
make up
```

**Nothing is exposed outside `127.0.0.1`.** Serenity never puts itself on the Internet: you reach it from your devices through the private path of your choice, a mesh network, a VPN, an SSH tunnel or a reverse proxy on your local network. The [infrastructure page](docs/02-infrastructure.md), in French, compares the four.

All the documentation is in [`docs/`](docs/README.md), in French, one page per phase.

<img src="docs/img/en/sections/s06.png" alt="06 Security and licence" width="100%">

> Serenity has not been audited yet. Do not put real accounts in it before version 0.1.0 and an external audit.

The non-negotiable rules are in [`CLAUDE.md`](CLAUDE.md). To report a vulnerability, go through [`SECURITY.md`](SECURITY.md), never a public issue.

The scope is kept deliberately narrow, so open an issue before writing code. [`CONTRIBUTING.md`](CONTRIBUTING.md) explains how to run the project, what to check before a pull request, and the rules that are not up for discussion.

Licensed under [GNU AGPL v3](LICENSE) or later, copyright (C) 2026 Tristan. That is the usual choice for a self-hosted server, the one the Bitwarden server made among others: anyone running a modified Serenity for other people has to publish the code. Serenity comes with no warranty whatsoever.
