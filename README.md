# nightmarquee

Cinematic website prompts with live previews, inside your editor.

Art-directed prompts for hero sections, landing pages, SaaS, portfolio,
e-commerce and 3D/WebGL scenes. Each is tuned for Lovable, Bolt, Cursor,
Claude and Codex, and each has a live demo you can scroll.

An MCP (Model Context Protocol) stdio server. Node 20 or newer.

## Install

**Claude Code**

```bash
claude mcp add nightmarquee -- npx -y nightmarquee
```

**Claude Desktop / Cursor**: add to your MCP config:

```json
{
  "mcpServers": {
    "nightmarquee": {
      "command": "npx",
      "args": ["-y", "nightmarquee"]
    }
  }
}
```

Claude Desktop reads `~/Library/Application Support/Claude/claude_desktop_config.json`
on macOS and `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Cursor
reads `~/.cursor/mcp.json`, or `.cursor/mcp.json` inside a project.

**Codex**: the CLI, the IDE extension and the ChatGPT app share one config.

```bash
codex mcp add nightmarquee -- npx -y nightmarquee
```

That writes this to `~/.codex/config.toml`, which you can also add by hand
(or to `.codex/config.toml` in a trusted project):

```toml
[mcp_servers.nightmarquee]
command = "npx"
args = ["-y", "nightmarquee"]
```

Codex uses the tools but does not show MCP prompts as commands yet, so ask for
a design in plain language and it calls `nightmarquee_search_prompts`. Prompts
come back in the Codex dialect unless you pass another `tool`.

No account needed. Free prompts work immediately.

## Use

- `nightmarquee_search_prompts`: browse by `query`, `category` or `tier`
- `nightmarquee_get_prompt`: fetch one by `slug`, optionally with your own
  `brand` name and a `tool` dialect (`lovable`, `bolt`, `cursor`, `claude`,
  `codex`). Without one you get `codex` in Codex and `claude` elsewhere
- `nightmarquee_get_footage`: fresh download links for a demo's footage, when
  the ones from `nightmarquee_get_prompt` have expired
- `nightmarquee_sign_in`: connect an account to unlock Unlimited prompts
- `nightmarquee_whoami`: check what's connected

Categories are `hero`, `landing`, `saas`, `portfolio`, `ecommerce`, `3d` and `mobile`.

Ask for a design in plain language and the model will usually reach for
`nightmarquee_search_prompts` on its own. Or drive it directly:

```
nightmarquee_get_prompt(slug: "glasshouse-nine", tool: "cursor", brand: "Northwind")
```

Every prompt in the catalog is also registered as an MCP prompt, so the whole
library shows up in your client's command palette. In Claude Code that means a
slash command per design:

```
/mcp__nightmarquee__glasshouse-nine
```

Other clients surface MCP prompts their own way. Claude Desktop lists them in
the attachment (`+`) menu; Codex does not list them yet. The list is built from the catalog fetched at
startup, so if the server can't reach nightmarquee.com when your editor
launches, the tools still work but the per-prompt commands won't appear until
you restart.

## Footage

Most demos play video. When your account may download it, `nightmarquee_get_prompt`
returns the footage from the demo, every clip, with a signed link per file, and
the prompt text ends with a note naming each clip. The agent downloads the files
into `public/` under their names and then builds, so the page you get plays the
same footage as the demo. The links last 10 minutes; `nightmarquee_get_footage`
fetches fresh ones without the prompt.

A free prompt's footage needs a free account, and the rest come with
Unlimited. Without an account, the prompt text still arrives in full, with one
line saying how many clips the demo plays and that `nightmarquee_sign_in` gets
them. Each account can fetch 30 packs an hour, shared with downloads on the
site.

In Lovable and Bolt, download the files from the prompt page on
nightmarquee.com and upload them there.

## Unlimited

Some prompts are free, currently `glasshouse-nine`, `aetheris-voyage`,
`nordlys-fintech`, `solstice-festival`, `lumen-observatory`, `sumi-atelier`,
`wren` and `fieldnote`. The rest need
[Unlimited](https://nightmarquee.com/pricing?ref=mcp). Run
`nightmarquee_search_prompts` with `tier: "free"` for the live list.

Run `nightmarquee_sign_in` and approve the code in your browser. It waits about
a minute; if you took longer, run it again and it picks up the same request
rather than issuing a new code. Either way the rest unlock in the same session,
no restart. Fetching a locked prompt without an entitlement returns a
teaser and a pricing link, never the body.

For headless environments where no browser is reachable, carry a token across
instead: sign in once on a machine that has a browser, copy the `token` value
(`nm_live_…`) out of `~/.nightmarquee/credentials.json`, and set it there.

```json
{ "env": { "NIGHTMARQUEE_TOKEN": "nm_live_..." } }
```

Connections are listed on [your account page](https://nightmarquee.com/account)
and can be revoked from there; the next call falls back to free-only.

## Configuration

| Variable | Effect |
|---|---|
| `NIGHTMARQUEE_TOKEN` | Use this token instead of the stored one. Wins over `credentials.json`. |
| `NIGHTMARQUEE_API` | Point at a different backend. Defaults to `https://nightmarquee.com`. |
| `NIGHTMARQUEE_HOME` | Directory for `credentials.json`. Defaults to `~/.nightmarquee`. |
| `NIGHTMARQUEE_TIMEOUT_MS` | Ceiling on every API request, in milliseconds. Defaults to `10000`; unparseable or non-positive values fall back to the default, and anything above `2147483647` is clamped to it. |
| `NIGHTMARQUEE_NO_TELEMETRY` | Set to `1` (any non-empty value works) to stop sending the install ID and your client's name. See below for exactly what this does and doesn't cover. |

## Privacy Policy

Full policy: <https://nightmarquee.com/privacy>

### What is collected

Credentials are stored locally at `~/.nightmarquee/credentials.json`, mode 0600.

Fetching a prompt is an HTTP request to nightmarquee.com, so the server
necessarily sees which prompt slug and tool dialect you asked for, and logs
that. That is true in every configuration.

On top of that, each request carries three headers by default:

- `x-nm-install`: a random UUID generated on your machine on first run and
  kept in `credentials.json`. Not derived from anything, tied to nothing else.
- `x-nm-client`: the name and version your MCP client reports, e.g.
  `claude-code/2.1.240`. In Codex this package also asks for the Codex dialect
  itself, so turning telemetry off does not change which prompt text you get.
- `x-nm-version`: the version of this package.

If you are signed in, the request also carries a bearer token identifying your
NightMarquee account.

**Never sent, in any configuration:** the prompts or code you write, file
paths, file contents, or anything else from your project.

### How it is used and stored

Request records are used to operate the service and to understand which prompts
people use, nothing else. They are held in our Supabase database.

### Opting out

`NIGHTMARQUEE_NO_TELEMETRY=1` drops `x-nm-install` and `x-nm-client`.
**`x-nm-version` is still sent**, and requests are still made and still logged
server-side, and the log rows just carry no install ID and no client name. If you
are signed in, the bearer token identifies your account regardless of this
setting.

### Third-party sharing

Your data is not sold, rented, or shared with third parties for their own
purposes. It is processed only by the infrastructure providers running the
service on our behalf: Vercel (hosting), Supabase (database), and Lemon Squeezy
(payments, for subscribers only). No advertising or analytics networks receive
any of it.

### Retention

Account data is kept while your account exists. Email
<support@nightmarquee.com> to delete your account and we remove your data
within 30 days, except records we must keep for tax and accounting (held by the
merchant of record).

Request records are not currently expired on a fixed schedule; they are deleted
on request along with your account.

Tokens and local credentials are under your control at any time: revoke a
connected editor from your [account page](https://nightmarquee.com/account),
which deletes the token outright, or delete `~/.nightmarquee/credentials.json`
to remove the local copy.

### Contact

Privacy questions, data access, and deletion requests:
<support@nightmarquee.com>

## License

The server code in this package is MIT.

The prompt text it fetches is licensed separately: free prompts cover personal
and non-commercial projects, Unlimited adds commercial use, and the prompt text
itself may not be republished or resold. Full terms:
<https://nightmarquee.com/license>.

MIT © NightMarquee
