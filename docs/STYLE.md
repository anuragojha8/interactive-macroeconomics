# Style guide

**Version** 1.0
**Applies to** all prose in `src/content/`, all component copy, all captions, and
every string in a `Relation.because` or `Invariant.why`.

The reader is a graduate in another technical field with no economics beyond
secondary school. That reader is not short of intelligence and is short of time,
and will abandon anything that reads as exam preparation or as marketing.

---

## 1. Voice

Exposition is third person. The economic objects are the actors: capital
accumulates, output depends on the capital already in place, an identity
constrains any account of the data. This satisfies the demand for active voice
without reaching for "we," and it is also more accurate, because the claims are
about the economy rather than about the author.

**"We," "our," "let us," and "let's" never appear.** The collaborative voice is
the single clearest marker of machine-written text, and it fakes a relationship
the page cannot have.

**"You" appears only in operations.** An instruction to act, a prediction to
commit to, or an observation to make: *raise the investment rate in the panel*,
*commit to a direction for each before the model runs*, *notice what did not
move*. Exposition never addresses the reader. A sentence that explains something
and a sentence that asks for an action are different kinds of sentence, and the
grammar should make that visible.

No exclamation marks. No enthusiasm about the material — the material carries
itself, and the reader can tell the difference.

## 2. Marking what is contestable

Roughly half of macroeconomics is accounting and roughly half is assumption, and
the distinction is the reason this book exists. The prose carries it as
faithfully as the interface does.

**Accounting claims are stated flatly.** No hedge, no attribution, no softening:

> Output equals consumption plus investment plus government purchases plus net
> exports.

**Assumption-dependent claims name the assumption in the same sentence.** Not in
a footnote, not in a later caveat:

> Under the fixed investment rate assumed here, a rise in output raises
> investment proportionally.

A claim that cannot be marked either way has not been thought through yet.

Where a chapter relies on a contested assumption, the objection appears in the
text rather than only in the model's `arguable` field. State the strongest
version of the objection, not a convenient one.

## 3. Sentences

Active voice throughout. Passive is permitted only where the agent is genuinely
unknown or irrelevant.

Most sentences run under 25 words. Long sentences earn their length by carrying a
real subordinate clause, never by accumulating qualifications.

Vary sentence length deliberately. A short sentence is emphasis, so a paragraph
containing three of them contains none, and a paragraph that ends on one should
have earned it. Never manufacture a short sentence to satisfy a rhythm: if the
paragraph does not need emphasis, it does not get any. An earlier version of this
guide required one short sentence per paragraph, and the prose filled with
sentences like *The reason is familiar* that carried nothing and announced
themselves coming.

One idea per sentence. Where two ideas are joined by "and" and neither depends on
the other, they are two sentences.

## 4. Structure

Paragraphs carry reasoning and are connected by the logic of the argument, not by
transitional words. If a paragraph opens with "Furthermore," the connection has
not been made.

Headings mark genuine divisions of subject, not decorative breaks. A section with
three headings and four sentences each is a slide deck.

Bullets are for genuinely parallel items — three assumptions, four sector
balances, five primitives — with parallel grammar across every entry. Reasoning
never goes in bullets, because bullets cannot express dependence between claims.

Numbered steps are correct in derivations and procedures, where order is part of
the content. Ordinal words as prose transitions are not.

## 5. Technical terms and notation

Every technical term is defined at first use, in the sentence that introduces it,
in one clause. No term is used before its definition anywhere in reading order.

Every symbol is registered in the symbol sheet with an `introducedIn` anchor, and
notation follows Jones 5e (overbars for fixed quantities, lowercase for
per-person quantities). When a later chapter changes a symbol's status — capital
losing its overbar once something accumulates it — the change is stated, not
performed silently.

## 6. Numbers

**No number in prose asserts a model result — in digits or in words.** "A factor
of two", "five thirds" and "twenty-seven thousand" are numerals wearing a coat,
and they go wrong exactly as silently when the calibration moves. Displayed
figures resolve from the engine through `<Result of="…" />` and `<Delta …/>`
(spec §5.7). Prose may name a ratio the reader is meant to hold in mind only
where the same figure is rendered from the engine in the same paragraph.

Round numbers appear only where the underlying quantity is round. A model result
quoted to two decimals in one sentence and to none in the next reads as
carelessness about precision, which is the impression this book can least afford.

## 7. Limits

Every section states what its model cannot say. This is not modesty. A model
whose limits are hidden teaches false confidence, and a reader who meets those
limits later without warning will discard everything else along with them.

## 8. Banished

Never: delve, tapestry, landscape, beacon, testament, paramount, underscore (as a
verb), furthermore, moreover, in conclusion, it is important to note, it is
crucial to remember, at the end of the day, navigate (figuratively), unlock,
leverage (as a verb), robust (as praise), seamless, game-changing.

Never: **simply, just, obviously, of course, clearly, trivially.** These tell a
reader who is struggling that the fault is theirs. If a step is easy, it does not
need saying; if it is not, the word is a lie.

Never: a closing paragraph that restates what the section already said. The
section ends when the argument ends.

Retained deliberately: *strictly speaking*, *in fact*, *by construction*, *note
that*. These are precision markers and this book needs them.

## 9. Analogies

Analogies to programming, physics, or control systems are used where they carry
real structure — a stock is an accumulator, market clearing is a fixed point, a
policy rule is a control law. They are never used decoratively, never stacked,
and never extended past the point where the mapping holds. An analogy that
requires a caveat to survive is the wrong analogy.

## 10. Enforcement

`npm run lint:prose` checks what a regular expression can honestly check, over
string literals and JSX text only — a non-null assertion is not an exclamation
mark, and `justify-content` is not the word "just".

**Fails the build:** the collaborative voice, the banished vocabulary, the
reader-blaming words, exclamation marks, and any sentence over 40 words.

**Reported for judgement:** sentences over 25 words, paragraphs with three or more
short sentences (emphasis spent until it is worth nothing), second person, and
figures appearing in prose — in digits or spelled out.
None of these can be decided mechanically. A figure may be a calibration input,
which is allowed, or a model result, which is not; a "you" may be an instruction,
which is allowed, or exposition, which is not. The report exists so that every
instance is looked at rather than assumed.

## 11. The test

Every claim about model behaviour is checkable in the model on the same page.
Authority in this book comes from the reader being able to run the sentence, not
from the tone it was written in.
