---
name: "nightmarquee-put-online"
description: "Put a NightMarquee starter online: commit it to the person's own private git repo, deploy it on Vercel, or both, asking before every push and every deploy. Use when someone wants to publish, deploy, host or share the site they built from a NightMarquee starter."
---

# Put a starter online

This skill takes a starter folder to a live site with the person's own `git`, `gh` and `vercel` tools. It never asks for a token: the CLIs sign the person in themselves. Ask before every push and every deploy, and wait for a yes.

The repo stays private. Every starter file carries a licence line with the email it was issued to, and the licence does not allow republishing the starter: https://nightmarquee.com/license. Never create a repo that is not private, and never change one to public.

In PowerShell, write `curl.exe` where these steps say `curl` (plain `curl` there is a different command), unzip with `Expand-Archive <slug>-starter.zip -DestinationPath . -Force`, and set a variable with `$env:NAME="1"` before the command that reads it.

Ask which route they want: their own git repo, Vercel, or both (the repo first, then Vercel imports it).

## Their own git repo

1. In the starter folder, `git status`. If it is not a repo yet, `git init`. Show what will be committed (`.gitignore` already leaves out `node_modules`, `.env*` and our files in `public/drops/<slug>/`). If a file of their own in `public/drops/<slug>/` is not in the list, add its line, `!public/drops/<slug>/<their file>`, as `nightmarquee-make-it-mine` says. Then commit.
2. A remote they already have: with `gh` and a GitHub remote, check it is private (`gh repo view --json visibility`), and if it is not, stop and say why. Otherwise, ask the user to confirm the repo is private, and do not push until they say yes.
3. No remote: with `gh`, ask, then `gh repo create <name> --private --source . --remote origin`. Without `gh`, ask them to create a private repo on their git host and give you its address, then `git remote add origin <address>`.
4. Ask, then `git push -u origin <branch>` (`git branch --show-current`).

## Vercel

Vercel's free plan (Hobby) is for personal, non-commercial sites. A business site needs a paid Vercel plan.

1. Use `vercel` if it is installed, or `npx vercel`. It opens the sign-in itself the first time.
2. Only if the starter uses `NEXT_PUBLIC_FOOTAGE_LOCAL=1` (every clip replaced, often in `.env.local`), set it on the project first, after asking: `vercel link`, then `echo 1 | vercel env add NEXT_PUBLIC_FOOTAGE_LOCAL production` and the same for `preview`. Nothing else needs setting: a single swapped clip or image is a committed file, and ours stream from media.nightmarquee.com.
3. Ask, then `vercel` for a preview. Give the person the preview address.
4. Ask, then `vercel --prod`. Give the live address, and check it answers: `curl -fsI "<address>"`.

Or import the git repo on vercel.com (New Project), and add `NEXT_PUBLIC_FOOTAGE_LOCAL` = `1` under Environment Variables, only when the starter uses it.

## In a chat host

In a chat host with no shell, give the person these steps to run themselves, or point them to importing their private repo on vercel.com, with the line above about Vercel's free plan, and stop.

## Next

Once the site is live, offer the public check from `nightmarquee-ai-look-test` on its address, for the NightMarquee score. Run it only on a yes.
