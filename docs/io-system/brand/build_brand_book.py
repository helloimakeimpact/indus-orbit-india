"""Render the reviewable Indus Orbit brand book from local, versioned assets.

Run with the bundled Python runtime (reportlab, Pillow, pypdf). No network calls.
The accompanying Markdown specifications remain the complete editable record.
"""

from pathlib import Path
import html
import json
import re
import unicodedata

from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from PIL import Image
from pypdf import PdfReader


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
TARGET = OUT / "indus-orbit-brand-book-and-redesign-proposal-v1.pdf"
W, H, M = 864, 648, 46
CW = W - 2 * M
C = {
    "ink": "#20234E", "paper": "#FBF7EC", "white": "#FFFDF7",
    "saffron": "#EFAD45", "amber": "#875000", "green": "#316B53",
    "sky": "#DFEAF1", "peach": "#F9D8BE", "muted": "#57596C",
    "line": "#D4D1C8",
}
for name, file in [("Inter", "inter-400.ttf"), ("InterBold", "inter-600.ttf"), ("Fraunces", "fraunces-400.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(HERE / "fonts" / file)))
pdfmetrics.registerFontFamily("Inter", normal="Inter", bold="InterBold", italic="Inter", boldItalic="InterBold")
cv = canvas.Canvas(str(TARGET), pagesize=(W, H), pageCompression=1)
cv.setTitle("Indus Orbit | Brand philosophy, visual guidelines and site proposal")
cv.setAuthor("Indus Orbit")
cv.setSubject("Review edition 1 | Messaging + Terminal | 22 October 2026")
pages = []


def clean(value):
    value = str(value).replace("\u2014", " - ").replace("\u2013", "-").replace("\u2011", "-")
    value = value.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    value = value.replace("\u2192", " > ").replace("\u00b7", " / ")
    return unicodedata.normalize("NFKC", value)


def fill(color):
    cv.setFillColor(HexColor(C.get(color, color)))


def rect(x, y, w, h, color="white", radius=0):
    fill(color)
    cv.roundRect(x, y, w, h, radius, stroke=0, fill=1)


def p(text, x, y, width, size=12, leading=None, font="Inter", color="ink"):
    style = ParagraphStyle("x", fontName=font, fontSize=size, leading=leading or size * 1.5,
                           textColor=HexColor(C.get(color, color)), splitLongWords=True)
    text = clean(text)
    q = Paragraph(text, style)
    _, height = q.wrap(width, H)
    if y - height < 42:
        raise ValueError(f"Page {len(pages)} text would clip: {text[:90]} ({y-height})")
    q.drawOn(cv, x, y - height)
    return y - height


def label(text, x, y, color="amber", size=9):
    fill(color)
    cv.setFont("InterBold", size)
    cv.drawString(x, y, clean(text).upper())


def image(path, x, y, width, height, crop=False):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    iw, ih = Image.open(path).size
    scale = max(width / iw, height / ih) if crop else min(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    cv.saveState()
    clip = cv.beginPath(); clip.rect(x, y, width, height); cv.clipPath(clip, stroke=0)
    cv.drawImage(ImageReader(str(path)), x + (width - dw) / 2, y + (height - dh) / 2,
                 width=dw, height=dh, mask="auto")
    cv.restoreState()


def page(section, title, desc="", dark=False):
    if pages:
        cv.showPage()
    pages.append({"page": len(pages) + 1, "section": section, "title": title})
    rect(0, 0, W, H, "ink" if dark else "paper")
    color = "white" if dark else "ink"
    label("Indus Orbit / " + section, M, H - 30, "saffron" if dark else "amber")
    fill("#777B99" if dark else "line")
    cv.rect(M, 39, CW, .5, stroke=0, fill=1)
    label("Strategy + design proposal / 22 October 2026", M, 24, "#D3D7E7" if dark else "muted", 7)
    label(f"{len(pages):02}", W - M - 17, 24, "#D3D7E7" if dark else "muted", 8)
    top = p(title, M, H - 63, CW, 36, 40, "Fraunces", color)
    if desc:
        top = p(desc, M, top - 16, CW - 90, 11, 16, color="#D3D7E7" if dark else "muted")
    return top - 28


def card(x, y, width, height, title, body, number=None, color="white"):
    rect(x, y - height, width, height, color, 12)
    top = y - 22
    if number:
        label(number, x + 22, top)
        top -= 17
    top = p(title, x + 22, top, width - 44, 23, 27, "Fraunces")
    p(body, x + 22, top - 12, width - 44, 11, 16, color="muted")


def cards(items, y, columns=2, height=162, gap=18):
    width = (CW - gap * (columns - 1)) / columns
    for idx, (title, body) in enumerate(items):
        row, col = divmod(idx, columns)
        card(M + col * (width + gap), y - row * (height + gap), width, height, title, body)


def rows(items, y, width=CW, size=12, gap=18):
    for title, body in items:
        y = p(title, M, y, width, size + 3, size + 7, "InterBold")
        y = p(body, M, y - 6, width, size, size * 1.5, color="muted") - gap
    return y


ASSET = HERE / "assets"
MIRROR = ROOT / "public/wiki-hero.jpg"
DAWN = ROOT / "src/assets/hero-india-dawn.jpg"
TREE = ROOT / "src/assets/about-banyan.jpg"
ROOF = ROOT / "src/assets/contact-rooftop.jpg"
LOGO = ROOT / "src/assets/indus-orbit-logo.png"
SOFT = ASSET / "mirror-soft-dawn-study-v1.png"
FOCUS = ASSET / "portal-quote-selective-focus-v1.png"
MSG = ASSET / "messaging-opportunity-study-v1.png"
TERM = ASSET / "terminal-opportunity-study-v1.png"

# 01 - Cover.
page("Brand book / review edition 01", "Indus Orbit")
label("The General Intelligence Company of India", M, 475, size=9)
p("Intelligence,<br/>built together.", M, 440, 350, 46, 49, "Fraunces")
p("Messaging + Terminal", M, 300, 340, 18, 25, "InterBold")
p("A core philosophy, a brighter visual world, and a proposal for a simpler website.", M, 254, 315, 13, 20, color="muted")
image(SOFT, 420, 116, 398, 398)
p("Portal of opportunity / proposed soft-dawn study", 420, 101, 398, 9, 13, color="muted")
p("Core identity preserved. New visual treatments and page organisation are proposals for review.", M, 129, 310, 10, 15, color="muted")

top = page("01 / Direction", "Two offerings. One shared purpose.", "The owner's latest product hierarchy is the organising rule for the entire brand and website.")
cards([
    ("Messaging", "People, relationships and context. Private conversations and relevant community or event groups help people find one another and carry shared intention forward."),
    ("Terminal", "Useful intelligence and action. A focused working environment helps a person explore, plan and build while understanding permissions, cost, state and outcomes."),
], top, height=187)
p("Events, communities, learning, programmes, shared work and research extend these two offerings. They add context and depth; each does not need to become another first-visit platform choice.", M, top - 220, CW, 16, 24, "Fraunces")

top = page("02 / Philosophy", "People become more capable<br/>when possibility is shared.")
p("Indus Orbit helps people find one another, exchange knowledge and turn worthwhile intentions into useful work with intelligence.", M, top - 4, CW - 30, 25, 34, "Fraunces")
cards([
    ("A practical promise", "Help someone find a worthwhile next step, a person to share it with, and the intelligence or tools to carry it forward."),
    ("A larger responsibility", "Let the benefit reach beyond the person already at the centre. Design participation for different places, abilities, backgrounds and starting points."),
], 300, height=175)

top = page("03 / Values", "The established pillars,<br/>expressed through behaviour.")
cards([
    ("Connection", "Clear invitations. Relevant introductions. Consensual contact. Conversations with context. A newcomer can understand where to begin."),
    ("Synergy", "Shared knowledge and effort. Useful tools. Clear authorship. People stay in control of work they make together."),
    ("Society", "Access, care and real contribution. Consider mobile, bandwidth, language, ability and safety. Show honest evidence of benefit."),
], top, columns=3, height=216)
p("Decision tests: agency / belonging / usefulness / care / truth. These guide review; they are not five more public pillars or navigation tabs.", M, 156, CW, 13, 20, color="muted")

top = page("04 / Architecture", "The company is the umbrella.", "Keep one identity. Make the two offerings obvious. Explain extensions when someone needs them.")
rect(M, top - 57, CW, 57, "ink", 10)
p("Indus Orbit  /  Intelligence, built together.", M + 22, top - 17, CW - 44, 20, 25, "Fraunces", "white")
cards([("Messaging", "Conversations / connections / groups"), ("Terminal", "Useful intelligence / work / control")], top - 80, height=122)
cards([("Participation", "Events, communities and programmes"), ("Capability", "Learning, skills and mentorship"), ("Evidence", "Research, writing and shared work")], top - 223, columns=3, height=140)

top = page("05 / Signature metaphor", "A portal of opportunity.", "The confirmed traveller-and-frame image is the reference. Its primary meaning is opportunity, capability and contribution.")
image(MIRROR, M, 92, 380, 380)
y = top - 6
for title, body in [("A familiar starting point", "An ordinary person in a recognisable place, with agency and a worthwhile intention."), ("An opening", "The frame suggests learning, connection, making or contribution. It need not imply a literal software feature."), ("A useful continuation", "Show what becomes possible for people and society. Keep the world earthly and the action believable.")]:
    y = p(title, 454, y, 364, 16, 22, "InterBold")
    y = p(body, 454, y - 8, 364, 12, 18, color="muted") - 24

top = page("06 / Portal series", "One grammar.<br/>Many people and possibilities.")
cards([
    ("A conversation", "Two people discover a shared purpose. The frame opens onto a gathering, a library or collaborative work. Messaging is the enabling relationship."),
    ("A useful idea", "A builder works thoughtfully with a tool. The frame connects intention to a practical outcome. Terminal supports the work; human judgment remains central."),
    ("A new capability", "An apprentice, a returning learner or an experienced mentor grows through knowledge and practice. Give each person their own agency."),
    ("A wider benefit", "A neighbourhood or collective makes something useful together. Show contribution without a guaranteed-outcome or saviour narrative."),
], top, height=166)

top = page("07 / Moodboard A", "Rooted. Human. Full of possibility.", "Observed core references: lived places, human conversation, roots, dawn and a considered pixel-illustration language.")
for idx, (file, caption) in enumerate([(DAWN, "Place + warm horizon"), (ROOF, "Human conversation"), (TREE, "Roots + continuity")]):
    x = M + idx * 263
    image(file, x, 235, 246, 204, crop=True)
    p(caption, x, 216, 246, 11, 16, "InterBold")
for idx, key in enumerate(["ink", "paper", "saffron", "green", "peach", "sky"]):
    rect(M + idx * 130, 125, 112, 44, key, 6)
    label(key, M + idx * 130, 109, size=8)
p("Keep the craft and feeling. Select subjects by meaning. Pixelation alone does not establish brand fit.", M, 77, CW, 11, 16, color="muted")

top = page("08 / Moodboard B", "Soft dawn. Clear intention.", "Proposed evolution: lighter paper, open shadows, warm peach light, quiet sky blue and precise working surfaces.")
image(MSG, M, 213, 462, 260, crop=True)
image(TERM, 529, 275, 289, 198, crop=True)
image(SOFT, 529, 83, 140, 168)
p("Atmosphere in the art.<br/>Clarity in the interface.", 686, 231, 132, 18, 25, "Fraunces")
p("Messaging + Terminal / image concepts", M, 196, 462, 11, 16, "InterBold")
p("Lift middle values, preserve crisp contours, soften distant forms and keep a few deep anchors. Avoid applying a global blur or glow to controls, people, logos or text.", M, 158, 455, 12, 18, color="muted")

top = page("09 / Light study", "Original to soft dawn.", "Preserve the original. Review a separately named derivative before a production rollout.")
for x, file, label_text in [(M, MIRROR, "Original / preserved master"), (443, SOFT, "Proposed AI art-direction study")]:
    image(file, x, 133, 375, 344)
    p(label_text, x, 115, 375, 11, 16, "InterBold")
p("The generated study interprets light and palette; it is not pixel-identical. The visible sun and some small details vary. Final production derivatives need a fidelity and crop review.", M, 76, CW, 10, 14, color="muted")

top = page("09A / Portal focus", "Only the opening is dreamlike.", "Owner correction, 22 October: blur only the scene inside the portal; keep the surrounding pixel artwork, traveller, frame and quote sharp.")
image(FOCUS, M, 77, 402, 402)
p("Intelligence, built together.", 521, 434, 297, 24, 31, "Fraunces")
p("The approved line is crisp over the sharp earthly scene. Only the sky within the frame softens into possibility. This is the selected campaign picture treatment; it is not a global image or interface blur.", 521, 344, 297, 13, 20)
p("Use a separately named derivative. Preserve the original. For a live webpage, retain essential wording as accessible text and avoid redundant headlines around a quote-bearing picture.", 521, 212, 297, 11, 17, color="muted")

for section, title, file, body in [
    ("10 / Messaging art", "A conversation opens a possibility.", MSG, "People are the focal point. Warmth comes from attention, light and lived detail. The frame can lead toward another place to learn or work together. This is a concept illustration, not a real event or member photograph."),
    ("11 / Terminal art", "Useful intelligence meets human agency.", TERM, "Show a person working with intention, rather than a robot or disembodied brain as the hero. Tools support judgment. The frame relates the work to a practical shared outcome; it does not promise automatic real-world execution."),
]:
    top = page(section, title)
    image(file, M, 132, 558, 372)
    p(body, 628, 477, 190, 12, 18, color="muted")
    p("Proposed picture asset / visual review edition", M, 106, CW, 10, 15, color="muted")

top = page("12 / Character system", "A coherent cast,<br/>with room for real variety.")
cards([
    ("Agency", "People make choices, contribute and work. Avoid passive mascots, saviour poses and guaranteed transformations."),
    ("Variety", "Different ages, genders, abilities, roles and backgrounds. Do not use one young male builder as the universal member."),
    ("Everyday places", "Include contemporary homes, libraries, workshops, neighbourhoods and campuses alongside rural places. India is not only monuments or mountains."),
    ("Consistent craft", "Keep an intentional apparent pixel scale, coherent anatomy and clear silhouettes. Review hands, mobility aids, expressions and crops."),
], top, height=165)

top = page("13 / Colour", "Bright surfaces. Deep anchors.", "Proposed sRGB proof palette. These references are not exact translations of current OKLCH tokens or already-installed theme values.")
palette=[("Indigo ink", "ink"), ("Warm paper", "paper"), ("Paper light", "white"), ("Saffron light", "saffron"), ("Deep amber", "amber"), ("Monsoon green", "green"), ("Sky mist", "sky"), ("Dawn peach", "peach")]
for i, (name, key) in enumerate(palette):
    row, col = divmod(i, 4); x=M+col*198; y=top-row*118
    rect(x, y-65, 178, 65, key, 7)
    p(name+"<br/>"+C[key], x, y-73, 178, 10, 15, "InterBold")
p("Indigo / warm paper 13.89:1   |   Indigo / saffron 7.60:1   |   Deep amber / paper 6.17:1", M, 159, CW, 11, 17, "InterBold")
p("Saffron / paper is only 1.83:1: use it decoratively, not for essential small text or the sole control boundary. Ratios are for these solid sRGB pairs; image, opacity and state combinations need rendered checks.", M, 119, CW, 11, 17, color="muted")

top = page("14 / Typography", "Editorial warmth.<br/>Working clarity.")
p("Intelligence,<br/>built together.", M, top, 415, 45, 49, "Fraunces")
p("Fraunces", M, 262, 350, 13, 20, "InterBold")
p("Selected editorial titles and moments of welcome. Use enough weight and contrast for the actual size and crop.", M, 232, 350, 12, 18, color="muted")
p("Inter", 486, top, 332, 32, 40, "InterBold")
p("Clear actions. Readable dates.<br/>Calm conversations.<br/>Precise permissions and state.", 486, top-67, 332, 19, 30)
p("Proposed web scale", 486, 254, 332, 13, 20, "InterBold")
p("Titles 40-72px desktop / 32-44px mobile.<br/>Body 16-18px / line-height about 1.5-1.65.<br/>Working information 14-16px.<br/>Avoid tiny tracked text as a default.", 486, 224, 332, 12, 20, color="muted")
p("Keep text live. Pixel-style lettering can be a limited campaign treatment, not the working interface font or essential text baked into a scene.", M, 112, CW, 11, 17, color="muted")

top = page("15 / Mark", "Use the actual pixel master.", "The existing master is a dimensional gold/orange pixel io on a pale canvas. It has no orbit ring.")
image(LOGO, M, 249, 235, 235)
rect(310, 249, 235, 235, "ink", 12); image(LOGO, 366, 305, 123, 123)
rect(574, 249, 244, 235, "white", 12); image(LOGO, 629, 305, 123, 123)
rows([
    ("Preserve geometry and colour", "No rounded substitute, invented ring, stretch, rotation, extra glow or art filter on the mark."),
    ("Make a reviewed export pack", "Record optical bounds, minimum sizes, clear space and appropriate light/dark exports. The current raster is not a transparent vector master."),
], 214, size=11, gap=13)

top = page("16 / Voice", "Warm, lucid, rooted and exact.")
cards([
    ("Lead with a task", "Prefer: Find people to work with.\nAvoid requiring someone to decode 'digital gravity' before they understand the invitation."),
    ("State real availability", "Prefer: This event accepts public guests.\nUse the actual registration state, not one badge for every event."),
    ("Explain authority", "Prefer: Review this action before it runs.\nDo not promise read-only execution when the runtime policy is unverified."),
    ("Give a next step", "Prefer: Your message could not be confirmed. Retry it here.\nKeep work and explain recovery without blame or theatrical claims."),
], top, height=165)

top = page("17 / Instagram", "Register what is already happening.", "Observed 22 October: the public @indusorbit bio and nine visible reel covers. This is a bounded visual review, not an analytics or full-caption audit.")
cards([
    ("Place and heritage series", "Lucknow, Delhi, Darjeeling/Guwahati, village/field and dawn imagery establish warmth, place and an invitation to participate. Keep the sense of place; improve text legibility."),
    ("S.O.D.A campaign", "The visible application-oriented cover and programme reference are existing brand activity. Covers date to April/May. Record the campaign; verify current intake, dates and application route before calling registration open."),
    ("Documentary work", "The visible workshop/robot cover belongs to actual work coverage. Documentary material can coexist with illustration when its role and provenance are clear."),
    ("Profile claim review", "The current bio refers to an inference platform and an open-source model. Confirm current evidence before repeating those as released capabilities. Keep the approved company definition."),
], top, height=169)

top = page("18 / Social system", "Three clear cover families.", "Illustrative templates for the proposed direction. Typeset separately; keep essential information out of the artwork.")
for idx, (file, tag, title) in enumerate([(MSG, "MESSAGING", "A worthwhile conversation."), (TERM, "TERMINAL", "An idea becomes useful work."), (SOFT, "OPPORTUNITY", "A place to begin.")]):
    x=M+idx*263; rect(x, 116, 246, 356, "white", 10)
    image(file, x, 259, 246, 213, crop=True)
    label(tag, x+17, 237, size=8)
    p(title, x+17, 214, 212, 22, 27, "Fraunces")
    p("Indus Orbit / Design example", x+17, 143, 212, 9, 13, color="muted")
p("Every live event/programme cover needs current title, date, place, scope and one route to act. Maintain safe crops for feed, square and story formats. These concepts are not live campaign announcements.", M, 85, CW, 10, 15, color="muted")

top = page("19 / Website audit", "The problem is competing hierarchy.", "The current source has a rich product and story. The first view asks people to process too many peer choices.")
cards([("8", "Primary public navigation links, plus a clock and account/join attention."), ("6-8", "Unconditional to maximum page-level homepage sections, before considering nested cards."), ("17", "Base member destinations, plus settings and contextual operator/account actions.")], top, columns=3, height=164)
p("The hero adds a company headline, the short line, another card headline, a long audience list, two actions and a separate note. Heavy art overlays and stacked explanations compete with the human invitation.", M, 259, CW, 16, 24, "Fraunces")
p("Source audit: cea1892 and current working tree. A live public homepage review confirms the major hierarchy; this book does not establish the Netlify deployed commit.", M, 125, CW, 10, 15, color="muted")

top = page("20 / Homepage proposal", "One company. Two doors. Five sections.")
bands=[("01", "A clear company invitation", "Approved definition and short line. Messaging + Terminal. One sentence of human benefit."), ("02", "The two offerings", "Show each in plain words with one focused preview and an authentic next step."), ("03", "Extensions of the two", "Events, communities, learning, programmes, research and shared work in one concise overview."), ("04", "How possibility becomes useful", "Connection, shared capability and contribution. Portal imagery explains the relationship."), ("05", "A worthwhile next step", "Return to Messaging or Terminal. One compact footer; deeper routes remain discoverable.")]
y=top
for num, title, body in bands:
    rect(M, y-65, CW, 65, "white", 8); label(num, M+18, y-24)
    p(title, M+66, y-14, CW-88, 15, 20, "InterBold")
    p(body, M+66, y-36, CW-88, 10, 14, color="muted"); y-=78

top = page("21 / Navigation", "A smaller menu,<br/>a complete company.")
cards([("Messaging", "The primary human-connection offering. Conversations, accepted connections and relevant groups. Keep Community access and group eligibility explicit."), ("Terminal", "The primary intelligence/work offering. Setup, current availability, local runtime and control. Explain advanced tools when useful."), ("Explore", "Events, communities, learning, S.O.D.A programmes, research and useful resources. Each has a clear relationship to the two main offerings."), ("About", "One coherent company story and How it works. Brand, contact, support and deeper writing remain discoverable without crowding the primary bar.")], top, height=167)

top = page("22 / Messaging surfaces", "Keep the new conversation system.", "Simplify the surrounding shell rather than starting another messaging implementation.")
cards([("First view", "Conversations and continuing work first. Make Messages and the Terminal product switch obvious. Use secondary navigation for context."), ("Within Messaging", "Chats / Connections / Groups. Preserve shared drafts, queue, visible read-through, anchored history, recovery and account boundaries."), ("Events and communities", "Gathering and membership give conversation a context. Invitations remain understandable to guests; entering chat has its own verified sign-in/eligibility rule."), ("Recovery and trust", "Use accurate Queued / Sending / Sent / Read / Failed states. Do not invent device-delivered or E2EE claims. Keep help, safety and privacy accessible.")], top, height=167)

top = page("23 / Terminal + download", "A clear entry to useful work.", "The DeepSeek Harness update is a separate runtime workstream. Branding and a download button are not proof of a tested, signed release.")
cards([("First screen", "Task, connection/setup state and a clear action. Reveal provider, routing, approvals, receipts and technical detail progressively."), ("Runtime identity", "Preserve upstream and third-party notices. Distinguish the Indus Orbit adaptation, its version, upstream basis and preview status."), ("Download package", "Show a real immutable artifact only after building and testing it. Include operating-system support, checksum, install/update/uninstall guidance and signing status."), ("Execution authority", "Bind and verify runtime policy. A web mode label or cloud record cannot prove that the daemon will request approval or block an action.")], top, height=170)

top = page("24 / Full redesign plan", "A finite sequence,<br/>with clear review gates.")
items=[("0 / Direction", "Approve the two-offering hierarchy, portal grammar, curation and concrete desktop/mobile proposal."), ("1 / Public entry", "Rebuild Home, navigation and footer with five sections. Correct availability/copy and preserve useful routes."), ("2 / Offering pages", "Messaging and Terminal get distinct, accurate explanations and authentic access/setup paths."), ("3 / Extensions", "Reorganise events, communities, learning, programmes and research without removing capabilities."), ("4 / Member + Terminal", "Calm member navigation; preserve continuity. Align the branded harness and truthful download surface."), ("5-6 / Acceptance + release", "Complete asset/copy, accessibility, responsive/performance and real-persona/runtime evidence, then stage and promote deliberately.")]
y=top
for title, body in items:
    label(title, M, y, size=10); y=p(body, M+178, y+5, CW-178, 11, 16, color="muted")-22

top = page("25 / Acceptance", "Minimal in hierarchy.<br/>Complete in responsibility.")
cards([("Understand", "A first visitor can identify Messaging and Terminal, explain their purpose and find a relevant next step without a glossary."), ("Use", "No 320px horizontal overflow or clipped actions; 200% text, keyboard, named dialogs, 44px key targets and reduced motion are reviewed."), ("Trust", "Availability, registration, permissions, cost and outcomes match current evidence. No fabricated people, attendance, testimonials or open intakes."), ("Return", "Drafts, context and account boundaries survive expected navigation, tab return and recovery. Genuine devices and supplier/runtime behaviour are checked in staging.")], top, height=168)

top = page("26 / Source and status", "A reviewable direction,<br/>with an honest delivery boundary.")
rows([("Established", "Indus Orbit / The General Intelligence Company of India / Intelligence, built together. / Connection, Synergy, Society."), ("Owner-confirmed direction", "Messaging + Terminal as the two main offerings; other areas extend them. Portal of opportunity, varied people and formats, brighter dreamy pixel illustration, Earth-rooted subjects."), ("Proposed and reviewable", "New palette references, generated picture studies, moodboards, website hierarchy and prototype. These do not establish a deployed redesign."), ("Source records", "The full Markdown guideline contains the complete 41-asset matrix, voice/style rules and production checklists. The separate code-level remainder report records implementation and runtime blockers.")], top, size=11, gap=16)

top = page("27 / References", "What informed this edition.")
sources=[("Current Indus Orbit source", "Brand route, styles.css, original assets, website and product navigation; review dated 22 October 2026.", None), ("Instagram / @indusorbit", "Public bio and nine visible reel covers. Full posts required login; no private analytics or account change.", "https://www.instagram.com/indusorbit/"), ("Luma / interaction reference", "A clear invitation, focused next action and progressive detail. Indus Orbit retains its own identity and two-offering architecture.", "https://luma.com/"), ("W3C / contrast", "WCAG 2.2 text and non-text contrast guidance; complete rendered accessibility still requires review.", "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"), ("Google Fonts / Fraunces + Inter", "Official font sources with accompanying OFL licences. Static review instances are embedded in this book.", "https://github.com/google/fonts"), ("Picture studies", "Generated from the confirmed local scene/style references for this proposal. Synthetic illustrations, not documentary evidence. Original masters remain preserved.", None)]
y=top
for title, body, url in sources:
    label(title, M, y, size=9)
    y=p(body, M+210, y+5, CW-210, 10, 15, color="muted")-21
    if url:cv.linkURL(url,(M,y+12,M+195,y+40),relative=0,thickness=0)

# Complete asset inventory, drawn from the reviewed Markdown rather than a
# separate hand-maintained list. Dynamic rows never overflow the page frame.
guide=(HERE/"BRAND_PHILOSOPHY_AND_GUIDELINES_2026-10-22.md").read_text()
section=guide.split("## 14.",1)[1].split("## 15.",1)[0]
inventory=[]
for line in section.splitlines():
    if not line.startswith("|") or not re.search(r"`(?:src/assets|public)/",line):continue
    fields=[x.strip() for x in line.strip().strip("|").split("|")]
    if len(fields)!=3:raise ValueError("Unexpected asset row: "+line)
    fields=[re.sub(r"[`*]", "", x) for x in fields]
    inventory.append(fields)
if len(inventory)!=41:raise ValueError(f"Expected reviewed 41-asset inventory, got {len(inventory)}")
def inventory_page():
    y=page("Appendix / complete curation", "Every existing raster has a role.", "41 source assets reviewed. Recommendations preserve files/history while changing meaning and prominence; referenced source is not proof of production visibility.")
    label("Asset",M,y,size=8);label("Current source use",M+222,y,size=8);label("Recommendation and reason",M+377,y,size=8)
    return y-18
y=inventory_page()
for asset,use,decision in inventory:
    texts=[asset.replace("src/assets/", "assets/"), use, decision]
    widths=[205,138,395]
    blocks=[]
    for text,width in zip(texts,widths):
        q=Paragraph(html.escape(clean(text)),ParagraphStyle("row",fontName="Inter",fontSize=8.6,leading=12.2,textColor=HexColor(C["ink"])))
        _,height=q.wrap(width,H);blocks.append((q,height))
    height=max(h for _,h in blocks)+17
    if y-height<62:y=inventory_page()
    fill("line");cv.rect(M,y-height+5,CW,.4,fill=1,stroke=0)
    for x,(q,h) in zip([M,M+222,M+377],blocks):q.drawOn(cv,x,y-h)
    y-=height

cv.save()
reader=PdfReader(TARGET)
assert len(reader.pages)==len(pages)
for number, page_obj in enumerate(reader.pages,1):
    assert len(page_obj.extract_text() or "")>100, f"Unexpected empty page {number}"
    assert float(page_obj.mediabox.width)==W and float(page_obj.mediabox.height)==H
record={"file":str(TARGET.relative_to(ROOT)),"pages":pages,"page_count":len(pages),"state":"Planned","review_date":"2026-10-22","moodboard_pages":[x for x in pages if "Moodboard" in x["section"]],"source_guideline":"docs/io-system/brand/BRAND_PHILOSOPHY_AND_GUIDELINES_2026-10-22.md","asset_inventory_count":len(inventory)}
(OUT/"indus-orbit-brand-book-pages.json").write_text(json.dumps(record,indent=2)+"\n")
print(json.dumps({"pdf":str(TARGET),"pages":len(pages),"bytes":TARGET.stat().st_size,"moodboard_pages":record["moodboard_pages"]},indent=2))
