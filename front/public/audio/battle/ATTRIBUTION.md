# Battle audio

All source recordings below are released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

- `victory-trumpets.mp3`: [Trumpet Fanfare](https://opengameart.org/content/trumpet-fanfare), Graciano Choc (gchoc / Bz.gamedev). Original `castlefanfare.mp3`, renamed without modification.
- `crossbow-*`, `bow-*`, `swing-*`: [Medieval Sound Effects – Weapon Textures](https://opengameart.org/content/medieval-sound-effects-weapon-textures), Ben Jaszczak and Brian Nelson / Still North Media. Crossbow Shoot, English Longbow Shoot, Katana Swing recordings.
- `step-*`, `hit-*`, `death`, `defeat`: [Impact Sounds](https://kenney.nl/assets/impact-sounds), Kenney. Concrete footsteps, soft heavy impacts, plate impacts.
- `block-*`: [Fantasy Weapons and Apparel SFX Library](https://opengameart.org/content/fantasy-weapons-and-apparel-sfx-library), Vehicle / Jan Schupke. Sword/knife clashes 01–03.
- `ice-*`: [Ice Spells](https://opengameart.org/content/ice-spells), bart, based on Stephan / pdsounds recordings.
- `fire-*`, `arcane-*`, `heal`, `encounter`, legacy `victory`: [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx), rubberduck. Fire/spell effects, gem, blade and coin sounds. The legacy coin cue is not used for victory.

Except the trumpet fanfare, clips were trimmed, downmixed to mono, peak-normalized, lightly filtered and faded, then encoded as 44.1 kHz / 96 kbps MP3. No source is sold as an independent sound pack.

Reproduction: extract the downloaded source archives into `weapon`, `impact`, `apparel`, `ice`, and `rpg` subdirectories, then run `node front/scripts/prepare-battle-audio.mjs /path/to/extracted-sources`. The script lists each source filename and trim interval. Download the trumpet file separately from its source page as `victory-trumpets.mp3`.
