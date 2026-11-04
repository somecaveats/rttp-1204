# RTTP 1204

Game tools for HIST 1200: The Remaking of the Medieval World, 1204.

- `/` : the student sack page (needs the class passcode)
- `/admin.html` : Sack Control, for the instructor (needs the instructor passcode)
- `/tools/` : Siege, Final Vote, March Pact display, and the Sack Decoder

The sack page saves each answer on the server (`netlify/functions/`), so answers can't be changed once locked in.
Set two environment variables in Netlify: `CLASS_PASSCODE` and `ADMIN_PASSCODE`.
