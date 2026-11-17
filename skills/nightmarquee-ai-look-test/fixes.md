A rule not listed here: use the detector's own description and say it has no NightMarquee fix.

# AI-look test fixes

The fix for each rule the AI-look test checks, for Impeccable 0.1.22. The id is `antipattern` in the detector's output and `rule` in `get_job`'s problems. "slop" rules make a page look AI-made and set the score; "quality" rules are about craft and are scored apart.

## ai-color-palette

**AI color palette** (slop)

Goal: A palette chosen for the brand, not the purple-and-cyan default.

Fix: Remove purple, violet and cyan gradients. Pick one brand accent, a neutral background and text colours, and use the accent sparingly.

## aphoristic-cadence

**Aphoristic-cadence copy** (slop)

Goal: A voice, not a formula.

Fix: Rewrite the repeated “X. No Y.” and “Not a feature. A platform.” lines as plain sentences. Keep one at most.

## blinking-cursor

**Decorative blinking cursor** (slop)

Goal: No fake typing where nothing can be typed.

Fix: Remove the animated blinking cursor from headings and hero text. Let the copy stand still.

## border-accent-on-rounded

**Border accent on rounded element** (slop)

Goal: Rounded elements keep a clean, even edge.

Fix: Drop the thick accent border from rounded cards, or drop the radius. Use a full hairline border if the card needs an edge.

## bounce-easing

**Bounce or elastic easing** (slop)

Goal: Motion that decelerates smoothly, like a real object.

Fix: Replace bounce, elastic and overshooting cubic-bezier curves with an ease-out curve such as cubic-bezier(0.22, 1, 0.36, 1).

## codex-grid-background

**Decorative grid-line background** (slop)

Goal: Grid lines only where something is being measured.

Fix: Remove the decorative hairline grid background. Keep grids for canvases, maps or technical drawings.

## cream-palette

**Cream / beige palette** (slop)

Goal: A background colour that comes from a deliberate palette.

Fix: Replace the reflexive cream or beige page colour with a background chosen from the brand palette, plain white or a considered dark.

## dark-glow

**Glowing shadow accents** (slop)

Goal: Depth from neutral shadows, not coloured halos.

Fix: Remove zero-offset coloured box-shadow and text-shadow glows. Use a soft neutral shadow with a vertical offset for elevation.

## em-dash-overuse

**Em-dash overuse** (slop)

Goal: Copy with a natural rhythm.

Fix: Replace most long dashes in body copy with full stops, commas, colons or parentheses.

## extreme-negative-tracking

**Crushed letter spacing** (slop)

Goal: Display type tight but still legible.

Fix: Ease letter-spacing on headlines back to about -0.02em to -0.04em so letters keep their shapes.

## flat-type-hierarchy

**Flat type hierarchy** (slop)

Goal: Headings clearly outrank body text at a glance.

Fix: Use a type scale with steps of at least 1.25x between body, subheadings and headings, and add one decisive jump for the main headline.

## gpt-thin-border-wide-shadow

**Hairline border with wide shadow** (slop)

Goal: Cards with one clear way of standing out.

Fix: On rows of cards, use either a hairline border or a soft shadow, not both on every card.

## gradient-text

**Gradient text** (slop)

Goal: Text in one solid colour that reads instantly.

Fix: Fill headings and numbers with one solid colour instead of a gradient. Put emphasis in weight, size or one accent colour.

## hero-eyebrow-chip

**Hero eyebrow / pill chip** (slop)

Goal: A hero that opens with the headline itself.

Fix: Delete the tiny uppercase label or pill chip above the hero headline. Work any important words into the headline or the line below it.

## icon-tile-stack

**Icon tile stacked above heading** (slop)

Goal: Feature lists that don't follow the stock card template.

Fix: Remove the rounded icon tile above each heading. Put a plain icon beside the heading, or drop the icons and lead with the text.

## italic-serif-display

**Italic serif display headline** (slop)

Goal: A headline voice that isn't the stock startup look.

Fix: Set the big headline and its accent words upright (roman). Keep the colour accent, or move to a non-serif display face.

## kicker-above-heading

**Kicker / eyebrow label above heading** (slop)

Goal: Headings that carry their own weight.

Fix: Delete the small tracked label sitting above each heading. If the words matter, fold them into the heading or the first sentence.

## marketing-buzzword

**Marketing buzzword** (slop)

Goal: Copy that says what the product literally does.

Fix: Replace words like streamline, empower, supercharge, world-class and cutting-edge with a specific verb and noun.

## marquee

**Auto-scrolling marquee** (slop)

Goal: Content that moves only when the reader moves it.

Fix: Replace the auto-scrolling marquee with a static row, or scroll it with the page and stop it when not visible. Respect prefers-reduced-motion.

## monotonous-spacing

**Monotonous spacing** (slop)

Goal: Spacing with rhythm: tight inside groups, generous between sections.

Fix: Use a spacing scale. Shrink gaps between related items and grow the space between sections so the structure is visible.

## nested-cards

**Nested cards** (slop)

Goal: One level of containers; content grouped by space and type.

Fix: Flatten cards inside cards. Keep the outer section plain and use spacing, headings and dividers to group the items.

## numbered-section-labels

**Tiny numbered section labels** (slop)

Goal: Structure that comes from content, not chapter numbers.

Fix: Remove the small 01, 02, 03 labels beside section headings. Let headings and spacing show the order.

## oversized-h1

**Oversized hero headline** (slop)

Goal: A first screen with room for more than one sentence.

Fix: Set long headlines smaller, around 40 to 64px on desktop, or cut the headline to a few words if it must be huge.

## overused-font

**Overused font** (slop)

Goal: Type that is recognisably yours, not the default of every generated site.

Fix: Replace Inter, Roboto, Geist, Fraunces, Plus Jakarta Sans or Space Grotesk with a less common face that suits the brand, and pair it with one body face.

## pulsing-dot

**Pulsing status dot** (slop)

Goal: Status indicators that only move when the data does.

Fix: Stop the decorative pulse. Show a static dot with a clear label, and animate only when the status really changes.

## radial-halo

**Radial-gradient background halo** (slop)

Goal: Backgrounds that are surfaces, not glowing clouds.

Fix: Remove the saturated radial-gradient glow behind sections. Use a solid background or a very subtle tonal shift.

## radial-spotlight-glow

**Decorative radial spotlight glow** (slop)

Goal: Sections lit by their content, not a floating coloured haze.

Fix: Delete the accent-coloured radial spotlight behind the hero. If the surface needs interest, use a real image or material texture.

## repeating-stripes-gradient

**Repeating-gradient stripes** (slop)

Goal: Surfaces with deliberate texture or none.

Fix: Remove repeating-gradient stripes used as decoration. Use a plain surface or a real texture image.

## shape-assembled-illustration

**Shape-assembled illustration** (slop)

Goal: Hero visuals that are real artwork, photography or product.

Fix: Replace the large SVG scene built from primitive shapes with a photograph, a product screenshot or a properly drawn illustration.

## side-tab

**Side-tab accent border** (slop)

Goal: Cards stand apart without a thick coloured stripe down one side.

Fix: Remove the one-sided accent border. Separate cards with spacing, a hairline border on all sides or a subtle background change.

## theater-slop-phrase

**Theater framing copy** (slop)

Goal: Copy that makes a plain claim.

Fix: Replace “X is just theater” framing with a direct statement of what the thing does or doesn't do.

## all-caps-body

**All-caps body text** (quality)

Goal: Long text in normal case.

Fix: Remove text-transform: uppercase from paragraphs. Keep capitals for short labels only.

## body-text-viewport-edge

**Body text touching viewport edge** (quality)

Goal: Text never touches the screen edge.

Fix: Wrap content in a container with at least 16px (ideally 24px) side padding, or constrain the widest element so it can't overflow.

## broken-image

**Broken or placeholder image** (quality)

Goal: Every image loads.

Fix: Give each img a real src, or remove the tag. Check the paths and that the files are deployed.

## buried-raster

**Raster buried under a wash or opacity** (quality)

Goal: Every image you ship is visible.

Fix: Lighten the wash over the background image below 90% opacity or use a blend mode, or remove the image you aren't showing.

## clipped-overflow-container

**Positioned child clipped by overflow container** (quality)

Goal: Menus, tooltips and popovers aren't cut off.

Fix: Remove overflow: hidden from the container, or move the positioned menu or tooltip outside the clipping element.

## content-hidden-at-rest

**Content invisible at rest** (quality)

Goal: Content visible even if an animation never runs.

Fix: Make text visible by default and let JavaScript add the entrance animation, instead of starting at opacity 0 and waiting for a script.

## cramped-padding

**Cramped padding** (quality)

Goal: Text inside boxes has room to breathe.

Fix: Add at least 12 to 16px of padding inside bordered or coloured containers.

## design-system-color

**Color outside DESIGN.md** (quality)

Goal: Colours match the documented palette.

Fix: Use a palette token from DESIGN.md, or add this colour there if it is intentional.

## design-system-font

**Font outside DESIGN.md** (quality)

Goal: Fonts match the documented design system.

Fix: Use a font from DESIGN.md, or add this one there if it is intentional.

## design-system-font-size

**Font size outside DESIGN.md** (quality)

Goal: Font sizes sit on the documented type ramp.

Fix: Use a size step from DESIGN.md, or add this step there if it is intentional.

## design-system-radius

**Radius outside DESIGN.md** (quality)

Goal: Corner radii match the documented scale.

Fix: Use a radius token from DESIGN.md, or add this value there if it is intentional.

## edge-flush-cards

**Cards flush against the scroller edge** (quality)

Goal: Cards in scrolling rows keep the same inset on both sides.

Fix: Size the scrolling panel to its container and add the same padding on both ends so the first and last cards aren't cut off.

## first-viewport-column-overflow

**One column stretches the first viewport** (quality)

Goal: Both columns of the opening section fit together.

Fix: Balance the hero columns: cap the tall one, or move its extra content below the opening row.

## gray-on-color

**Gray text on colored background** (quality)

Goal: Text on colour stays crisp.

Fix: Replace grey text on coloured backgrounds with a darker shade of that colour, or white or near-white.

## heading-rhythm

**Heading crowded against the previous block** (quality)

Goal: Each heading sits closer to its own content than to the block above.

Fix: Increase the space above headings so it is larger than the space below them.

## justified-text

**Justified text** (quality)

Goal: Even word spacing in narrow columns.

Fix: Use text-align: left, or add hyphens: auto if the text must stay justified.

## layout-transition

**Layout property animation** (quality)

Goal: Smooth animation that doesn't make the browser re-lay out the page.

Fix: Animate transform and opacity instead of width, height, padding or margin. For expanding panels, animate grid-template-rows.

## line-length

**Line length too long** (quality)

Goal: Lines of about 60 to 75 characters.

Fix: Add a max-width of about 65ch to paragraphs and text columns.

## low-contrast

**Low contrast text** (quality)

Goal: All text meets WCAG AA: 4.5:1 for body, 3:1 for large text.

Fix: Darken the text or lighten the background (or the reverse on dark pages) until the contrast ratio passes.

## organic-clip-path

**Organic contour drawn as clip-path** (quality)

Goal: Organic shapes that look like the real material.

Fix: Replace many-pointed clip-path polygons with a cut-out image or an alpha matte from the real photo. Keep clip-path for simple geometry.

## repeated-container-text

**Same text repeated inside one container** (quality)

Goal: Each card says each thing once.

Fix: Remove the duplicate labels repeated inside one card and keep the one where it matters most.

## script-error

**Uncaught script error on load** (quality)

Goal: The page loads without JavaScript errors.

Fix: Open the browser console on the page, fix the uncaught error it shows, and reload until the console is clean.

## skipped-heading

**Skipped heading level** (quality)

Goal: Headings in order, h1 then h2 then h3.

Fix: Change the heading tags so no level is skipped, and style them with CSS instead of picking tags by size.

## text-occlusion

**Text occluded by an overlapping element** (quality)

Goal: No text covered by another layer.

Fix: Move the overlapping box or image off the text, or give the text its own space with padding or a different stacking order.

## text-overflow

**Content overflowing its container** (quality)

Goal: Content stays inside its container.

Fix: Let text wrap, set max-width or overflow-wrap: anywhere on long strings, or give the region a visible scroll.

## tight-leading

**Tight line height** (quality)

Goal: Comfortable line spacing in paragraphs.

Fix: Set line-height to 1.5 to 1.7 for body text, and at least 1.1 for multi-line headings.

## tiny-text

**Tiny body text** (quality)

Goal: Body text at a readable size.

Fix: Set body text to at least 14px, ideally 16px.

## undersized-ui-text

**Undersized functional text** (quality)

Goal: Links, buttons and labels large enough to read and tap.

Fix: Raise functional text such as links, buttons, nav and table cells to at least 12px.

## wide-tracking

**Wide letter spacing on body text** (quality)

Goal: Body text with natural letter spacing.

Fix: Set letter-spacing on body text to 0 to 0.02em. Keep wide tracking for short uppercase labels.
