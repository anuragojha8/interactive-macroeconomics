# Style guide

**Version** 2.0 — rewritten after the first reader said the book read as though
it had been written in a hurry. They were right, and version 1 of this guide was
a large part of why.
**Applies to** all prose in `src/content/`, all component copy, all captions, and
every string in a `Relation.because` or `Invariant.why`.

The reader is a graduate in another technical field with no economics beyond
secondary school. That reader is not short of intelligence and is short of time,
and will abandon anything that reads as exam preparation or as marketing.

---

## 1. Voice

Write the way a senior practitioner explains something to a smart colleague from
another field: plainly, with conviction, and with evident respect for their time.
The closest model is Jamie Dimon's annual letters to JPMorgan shareholders — not
for their subject, but for how they sound. What to take from them:

- **Say what you think, then why.** Open a section with its point in plain words,
  then build the case. The reader should never have to hunt for the claim.
- **Be candid about what is uncertain.** "Nobody knows" and "this model gets it
  wrong" are allowed, and they make the confident sentences more credible, not
  less.
- **Keep the practical lens.** Tie ideas to what happens when someone is running
  a business, reading a budget, or arguing about policy on television.
- **Use plain words and concrete numbers.** A named example beats an abstraction.
- **Number the lessons when there genuinely are several.** Not otherwise.
- **Warmth without gush.** Friendly, occasionally dry, never performing.

**"You" is welcome, and "we" where it is natural** — "if we double capital",
"we have seen this shape before". What is banned is the chummy register that
flatters or presumes: *let's dive in*, *you might be wondering*, *as you can
see*, *you'll notice*, *buckle up*, *here's the thing*. The test: does the
sentence tell the reader something, or tell the reader about themselves?

No exclamation marks.

## 1a. Humour

Humour is allowed and wanted, in small doses and of one kind: **dry, and drawn
from the material itself.** The absurdity of a politician confusing a debt with a
deficit on live television is funny *and* teaches the distinction. A pun in a
heading teaches nothing.

- Roughly one light moment per section. Two is a lot. None across a whole chapter
  means the chapter has gone grey.
- Never at the reader's expense, and never at a named real person's.
- It has to be true. A joke that bends a fact is worse than no joke.
- Never partisan. Both parties confuse stocks and flows.

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

Let paragraphs breathe. Give an example before a definition, and say why an idea
matters before asking the reader to learn it. Version 1 of this guide produced
prose that was correct and clipped — definitions fired off like a glossary, and a
paragraph of four sentences where six would have been kinder. Aim for about a
quarter more words than the tightest possible version, spent on examples and on
the reason to care, never on filler.

Vary sentence length deliberately. A short sentence is emphasis, so a paragraph
containing three of them contains none.

**Two constructions are banned outright, because they are the loudest tells of
machine-written prose:**

- **"X is not Y. It is Z."** — *"That gap is not a fault. It is what the rule
  does."* Say what it is: *"That gap is simply what the rule does."* The
  contrast-then-correction shape is fine once a chapter; by the third use it is a
  tic, and version 1 used it on almost every page.
- **Em-dash stacking.** At most one pair of em-dashes per paragraph. Commas,
  colons and parentheses do most of the same work with less drama.

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

That defining use is marked with `<Term>`, and nothing else is. A term looks the
same wherever it is defined, in the body, a case file or a Break-it box: italic,
in full ink. Later uses of the term are plain. Italics are not used for emphasis;
put the important word where the sentence lands instead. The linter rejects a
bare `<em>` in chapter text.

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

Every section states what its model cannot say, for a practical reason: a model
whose limits are hidden teaches false confidence, and a reader who meets those
limits later without warning will discard everything else along with them.

## 8. Banished

Never: delve, tapestry, landscape, beacon, testament, paramount, underscore (as a
verb), furthermore, moreover, in conclusion, it is important to note, it is
crucial to remember, at the end of the day, navigate (figuratively), unlock,
leverage (as a verb), robust (as praise), seamless, game-changing.

Never: **obviously, of course, clearly, trivially.** These tell a reader who is
struggling that the fault is theirs. If a step is easy, it does not need saying;
if it is not, the word is a lie. ("Just" and "simply" are allowed when they mean
*merely* rather than *easily*.)

Never, from the chummy register: *let's dive in, let's explore, buckle up, here's
the thing, you might be wondering, as you can see, you'll notice, spoiler alert.*

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
string literals and JSX text only.

**Fails the build:** the chummy register, the banished vocabulary, the
reader-blaming words, exclamation marks, the "X is not Y. It is Z." construction,
more than one pair of em-dashes in a paragraph, and any sentence over 40 words.

**Reported for judgement:** sentences over 25 words, paragraphs with three or more
short sentences, and figures appearing in prose — in digits or spelled out. A
figure may be a calibration input, which is allowed, or a model result, which is
not; no regex can tell the difference.

## 11. The test

Every claim about model behaviour is checkable in the model on the same page.
Authority in this book comes from the reader being able to run the sentence, not
from the tone it was written in.
