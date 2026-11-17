# Deployment

## How the site is published now

GitHub Pages serves the repository itself: branch `main`, folder `/` (Settings → Pages → "Deploy from a branch"). There is no build. A push to `main` is live within a minute or two at

```
https://realvuk.github.io/ai-compass/
```

`.nojekyll` tells Pages to serve the files as they are. All asset paths in `index.html` are relative, so the site works at any address or folder.

## Moving to compass.vukdinic.com

The code for this is on the branch **`feature/custom-domain`**, which sits on top of `feature/launch-improvements` and changes only what depends on the address:

- adds `CNAME` containing `compass.vukdinic.com`;
- switches the canonical address, the Open Graph and Twitter addresses and the JSON-LD ids in `index.html`;
- adds `robots.txt` and `sitemap.xml` (they only work at the root of a host, so they wait for the domain);
- names both addresses in the privacy text and updates the README links.

**Do the steps in this order.** If the branch is merged before the DNS record exists, GitHub will redirect the working address to a name that does not resolve yet, and the site will be down until it does.

### 1. Merge `feature/launch-improvements` first

It works at the current address. It also gives visitors the "Restore your answers from a code" box they will need after the move (step 6).

### 2. Add the DNS record

At the DNS provider for `vukdinic.com` (the domain currently answers from Cloudflare addresses, so most likely the Cloudflare dashboard → DNS → Records):

| Type | Name | Target | TTL | Proxy (Cloudflare only) |
|---|---|---|---|---|
| `CNAME` | `compass` | `realvuk.github.io` | Auto | **DNS only** (grey cloud) |

Notes:

- The target is `realvuk.github.io`, with no `/ai-compass` and no `https://`.
- Leave the proxy off, at least until GitHub has issued the certificate in step 4. GitHub cannot issue one while Cloudflare is answering for the name. If you later want Cloudflare in front, turn the proxy on afterwards and set SSL/TLS mode to **Full (strict)**; "Flexible" causes redirect loops with Pages.
- Do not add `A` records for the subdomain.

Check it:

```bash
dig +short compass.vukdinic.com CNAME
```

It should print `realvuk.github.io.`

### 3. Merge `feature/custom-domain`

For a site deployed from a branch, the `CNAME` file sets the custom domain. After the merge, Settings → Pages should show `compass.vukdinic.com` under "Custom domain" with a DNS check in progress. If it does not, type the domain into that box and save; GitHub will then commit the same `CNAME` file.

### 4. Turn on HTTPS

On the same settings page, wait for "DNS check successful", then tick **Enforce HTTPS**. The certificate usually takes a few minutes and can take up to a day. The box is greyed out until it is ready.

### 5. Verify

```bash
curl -sI https://compass.vukdinic.com/ | head -n 1
```

Expect `HTTP/2 200`.

```bash
curl -sI https://realvuk.github.io/ai-compass/ | grep -i '^location'
```

Expect `location: https://compass.vukdinic.com/`. Once a custom domain is set, GitHub Pages answers the `github.io` address with a permanent redirect to it, keeping the rest of the path.

```bash
curl -s https://compass.vukdinic.com/ | grep -c 'compass.vukdinic.com/assets/og-image.png'
```

Expect `3` (Open Graph, Twitter and the structured data).

Then, in a browser:

- Open an old comparison link, `https://realvuk.github.io/ai-compass/#r-AIC2-…`. Browsers carry the `#…` part across a redirect, so it should arrive at the new address and add the friend. The format of codes has not changed.
- Paste the new address into a link-preview checker (for example the LinkedIn Post Inspector, or opengraph.xyz) and confirm the image, title and description.
- Open `https://compass.vukdinic.com/robots.txt` and `/sitemap.xml`.

### 6. Saved answers and the change of address

Browsers keep local storage separately for every site address. Answers saved at `realvuk.github.io` are therefore **not visible** at `compass.vukdinic.com`, and because the old address now redirects, its page can no longer run to hand them over. There is no automatic migration, and no honest way to build one without a server.

What still works:

- **Comparison links and codes** already sent keep working, as above.
- **A visitor who saved their code** (it is shown under Compare on the result page) can paste it into About → Privacy and your data → "Restore your answers from a code".
- **A visitor who did not** needs to take the quiz again. The quick route takes about three minutes.

If you have a result of your own that you want to keep, copy your code before step 3.

Restoring a code opens the saved scores even if the quick quiz included skips. Codes do not preserve the distinction between skipped and unreached questions: both remain unanswered after restoration, and continuing offers the first missing answer. No missing answer is filled in as neutral.

The privacy text on the About page explains this to visitors.

### 7. Afterwards

- Repository → About (the gear icon): set **Website** to `https://compass.vukdinic.com/`.
- In `wolflytics-site`, merge `feature/compass-domain`, which switches that site's links from the old address to the new one. Until then they keep working through the redirect.
- Optional but recommended: verify `vukdinic.com` for GitHub Pages (your account's Settings → Pages → "Add a domain"), which stops anyone else from claiming a subdomain of it on Pages.

### Rolling back

Remove the domain in Settings → Pages (or delete `CNAME`) and revert the `feature/custom-domain` merge. The site returns to `realvuk.github.io/ai-compass/`, where the earlier saved answers still are.

## Repository settings to update

Suggested values for the repository's About box:

- **Description:** `AI isn't one debate. It's eight. An interactive quiz that maps where you stand on eight questions about AI. No account, no tracking.`
- **Website:** `https://realvuk.github.io/ai-compass/` now, `https://compass.vukdinic.com/` after the move.
- **Topics:** `artificial-intelligence`, `ai-safety`, `ai-governance`, `ai-policy`, `quiz`, `political-compass`, `data-visualization`, `computational-social-science`, `javascript`, `no-build`, `static-site`, `github-pages`, `privacy-friendly`

Labels used by the issue templates that do not exist by default: `question wording` and `methodology`. Create them under Issues → Labels, or the templates will simply file issues without a label.

**Social preview** (Settings → General → Social preview): upload `assets/og-image.png`, so links to the repository itself show the same image.

## Re-making images

After a visual change:

```bash
node tools/capture.mjs preview
```

```bash
node tools/capture.mjs shots
```

```bash
node tools/capture.mjs video
```

The first rewrites `assets/og-image.png`. Link-preview services cache images, sometimes for days; the LinkedIn Post Inspector has a refresh button.
