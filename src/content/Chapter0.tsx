import { useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { solveDynamic } from '../engine/solve';
import { CaseFile } from '../components/mdx/CaseFile';
import { SortExercise } from '../components/mdx/SortExercise';
import { MathText } from '../components/mdx/MathText';
import { Controls } from '../components/stage/Controls';
import { ReconcilePanel } from '../components/stage/ReconcilePanel';
import { TimePath } from '../components/viz/TimePath';
import { bathtubModel } from '../models/kernel/bathtub';
import { fixedPointModel } from '../models/kernel/fixedpoint';
import { ledgerModel } from '../models/kernel/ledger';
import {
  thermostatBangBangModel,
  thermostatConstantModel,
  thermostatProportionalModel,
} from '../models/kernel/thermostat';
import { VERANO_BRIEFING } from '../case/verano';
import { useOverrides } from './useOverrides';

const SORT_ITEMS = [
  {
    id: 'expenditure',
    latex: 'Y = C + I + G + NX',
    answer: 'accounting' as const,
    because:
      'Everything produced was bought by someone: a household, a firm, the government, or a foreigner. The equation is just the list, added up. (Unsold goods count too, as investment in inventory, which is the accounting trick that keeps it exact.)',
  },
  {
    id: 'consumption',
    latex: 'C = (1 - \\bar{s})Y',
    answer: 'assumption' as const,
    because:
      'People could spend any share of their income they liked. Saying they always spend the same share is a claim about behaviour, and a strong one.',
  },
  {
    id: 'balance',
    latex: 'A = L + E',
    answer: 'accounting' as const,
    because:
      'Every transaction is recorded twice, once where the money came from and once where it went. Keep the books that way and they balance by construction.',
  },
  {
    id: 'investment',
    latex: 'I = \\bar{s}Y',
    answer: 'assumption' as const,
    because: 'The same claim as the consumption rule, seen from the other side of the ledger.',
  },
  {
    id: 'rental',
    latex: 'r = MPK',
    answer: 'assumption' as const,
    because:
      'True when markets are competitive. Where firms have pricing power, capital is paid less than it produces and the difference shows up as profit.',
  },
  {
    id: 'accumulation',
    latex: 'K_{t+1} = K_t + I_t - D_t',
    answer: 'accounting' as const,
    because:
      'Next year’s capital is this year’s, plus what was built, minus what wore out. All the behaviour hides in whatever decides I and D.',
  },
  {
    id: 'depreciation',
    latex: 'D_t = \\bar{d}K_t',
    answer: 'assumption' as const,
    because:
      'A fixed share wearing out every year is a modelling convenience. Houses, cars and laptops age on very different schedules, as anyone who has owned all three can confirm.',
  },
  {
    id: 'demand',
    latex: 'D = a - b\\,p',
    answer: 'assumption' as const,
    because: 'A claim about how buyers respond to price, and a bold one: that the response is a straight line.',
  },
  {
    id: 'per-worker',
    latex: 'y = Y / \\bar{L}',
    answer: 'accounting' as const,
    because: 'A definition. Output per worker is output divided by workers.',
  },
  {
    id: 'net-lending',
    latex: 'S_p + S_g - I = NX',
    answer: 'accounting' as const,
    because:
      'It falls straight out of the spending identity and the definitions of saving. Any story about a trade deficit has to fit through this equation.',
  },
  {
    id: 'thermostat',
    latex: 'h = h_{max} \\text{ if } T < T^*',
    answer: 'assumption' as const,
    because: 'A control rule, which someone chose. The physics of the room is the same whichever rule is picked.',
  },
];

const RULES_PERIODS = 60;

/**
 * The three control rules, and the single vertical range they are all drawn on.
 * Three thermostats each scaled to its own path look alike, which is the one
 * thing the figures must not say: the whole point is that the shapes differ.
 */
const THERMOSTATS = [
  { label: 'Constant heat', model: thermostatConstantModel },
  { label: 'On/off control', model: thermostatBangBangModel },
  { label: 'Proportional control', model: thermostatProportionalModel },
];

const THERMOSTAT_RANGE = ((): [number, number] => {
  const all = THERMOSTATS.flatMap((t) =>
    solveDynamic(t.model, { overrides: {}, periods: RULES_PERIODS }).path!.map((p) => p.T!),
  );
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || 1;
  return [lo - pad, hi + pad];
})();

export function Chapter0(): JSX.Element {
  const tub = useOverrides(bathtubModel);
  const ledger = useOverrides(ledgerModel);
  const market = useOverrides(fixedPointModel);
  const [rulesPeriods] = useState(RULES_PERIODS);

  return (
    <>
      <main className="prose">
        <span className="eyebrow">Chapter 0</span>
        <h1>The Kernel</h1>
        <p className="lede">
          Most people meet macroeconomics as a pile of diagrams: curves that shift for reasons
          nobody quite explains, memorised before an exam and forgotten soon after. This book makes a
          different bet. Underneath all those diagrams sit five ideas, and none of them is really
          about economics. If you have written software, you have already used every one.
        </p>

        <p>
          The five are stocks and flows, accounting identities, budget constraints, behavioural
          rules, and market clearing. This chapter introduces each one in a setting with no money in
          it at all: a bathtub, a lemonade stand, a thermostat and a market searching for its
          price. Once the machinery feels ordinary, the economics is mostly a question of which
          rules to believe.
        </p>

        <h2 id="stocks">Stocks and flows</h2>
        <p>
          Start with the bathtub. The water in it is a <em>stock</em>, a quantity you measure at a
          single moment, like a snapshot. The tap is a <em>flow</em>, a quantity you can only
          measure over a stretch of time, like a video. Your bank balance is a stock and your salary
          is a flow. In an economy, capital is a stock and investment is a flow.
        </p>
        <p>
          This sounds like a distinction only a pedant could love, right up until you watch a
          televised debate about government debt. Debt is a stock. The deficit is a flow: roughly
          how much the debt grows this year. The two get swapped on air with impressive
          regularity. A minister promises to cut the deficit, the audience hears a promise to cut
          the debt, and next year the debt is bigger anyway. A smaller deficit only means the debt
          grows more slowly.
        </p>
        <p>
          The tub below fills from a tap and drains through a plughole, and the fuller it gets, the
          faster it drains. Open the tap wider and watch the level. It rises, but not forever.
        </p>

        <ErrorBoundary label="The bathtub">
          <TimePath
            model={bathtubModel}
            overrides={tub.overrides}
            varId="S"
            periods={120}
          />
        </ErrorBoundary>
        <Controls
          model={bathtubModel}
          overrides={tub.overrides}
          onChange={tub.set}
          controls={['inflow', 'drainRate']}
          periods={1}
        />

        <p>
          The level settles where the water leaving matches the water arriving, at the inflow
          divided by the drain rate. Check it against the sliders. The same arithmetic runs a
          subscription business: win 1,000 customers a month, lose 5% of the base each month, and
          the base levels off at 20,000 however long you wait. It also decides where a capital
          stock settles, and where a country’s debt settles as a share of its income.
        </p>
        <p>
          A caveat. A real plughole drains roughly with the square root of the depth, as Torricelli
          worked out in the 1640s, rather than in proportion to it. Change the rule and the resting level moves; that there is a resting level at all
          stays put. Most of this book works like that: the exact numbers depend on assumptions, and
          the shape of the answer usually does not.
        </p>

        <h2 id="identities">Identities and budget constraints</h2>
        <p>
          An <em>identity</em> is an equation that holds because of how its terms are defined. You
          cannot test it, refute it, or repeal it, however much a finance minister might like to.
          A <em>budget constraint</em> is the everyday version. Over any period, the money
          coming into a household, a firm or a government equals the money going out, once
          borrowing and saving are counted. A government that spends more than it collects in
          taxes must borrow the difference, and that borrowing is what adds to the debt. The
          bathtub and the budget are the same arithmetic, seen from two sides.
        </p>
        <p>
          The books below belong to a lemonade stand. Assets equal liabilities plus equity, because
          every transaction gets recorded twice: once where the money came from, and once where it
          went. Keep the books that way and they balance by construction. Italian merchants had the
          system running by the fourteenth century. It works like a checksum: it cannot tell you
          the numbers are right, but it will tell you when half of a transaction has gone
          missing.
        </p>
        <p>
          Now break it on purpose. Change a single entry, the way a clerk might record a sale and
          forget the cash. The books stop balancing, and the panel lists each single entry that
          would bring them back. There is always more than one, and nothing in the arithmetic says
          which is right. Chapter 1 turns that same fact on a country’s trade deficit.
        </p>

        <ErrorBoundary label="The ledger">
          <ReconcilePanel model={ledgerModel} overrides={ledger.overrides} onChange={ledger.set} />
        </ErrorBoundary>

        <h2 id="rules">Behavioural rules</h2>
        <p>
          A <em>behavioural rule</em> describes what somebody chooses to do: how much a family saves,
          how fast a firm hires, how a central bank sets interest rates. Rules are where a model makes
          its claims about the world, so they are where it is most often wrong and the part most
          worth arguing about. When two economists disagree, check the rules first. The accounting
          is rarely where the disagreement lives.
        </p>
        <p>
          Here are three thermostats in three identical rooms. Heat leaks out in proportion to the
          gap between inside and outside, and that physics is the same code in all three.
          The only thing that differs is the rule the thermostat follows.
        </p>

        <div className="charts charts--three">
          {THERMOSTATS.map((t) => (
            <ErrorBoundary key={t.label} label={t.label}>
              <TimePath
                model={t.model}
                overrides={{}}
                varId="T"
                periods={rulesPeriods}
                label={t.label}
                domain={THERMOSTAT_RANGE}
                compact
              />
            </ErrorBoundary>
          ))}
        </div>

        <p>
          Constant heat ignores the target altogether
          and parks the room wherever the heater and the leak happen to balance. On/off control
          never rests: it overshoots, switches off, undershoots and starts again, the way most
          household thermostats do. Proportional control settles short of the target and stays
          there. Right at the target it asks for no heat while the room is still losing some, so
          it parks where the heat it asks for matches the leak. Engineers call that gap
          steady-state error, and it comes with the rule rather than with a faulty thermostat.
          Central bank rules carry a “neutral” interest rate for a similar reason: it is the
          setting meant to hold the economy steady when everything is on target. Nobody can
          observe it directly, which is why it is argued over so much.
        </p>
        <p>
          Hold on to these three shapes. Most policy rules later in the book are versions of one of
          them. In each
          case the economy underneath stays the same, and the rule changes what happens to it.
        </p>

        <h2 id="clearing">Market clearing</h2>
        <p>
          A market <em>clears</em> when the quantity buyers want equals the quantity sellers offer
          at the going price. Stated that way it is a definition. Stated as something that actually
          happens, it is an assumption about a process: a price that is too low gets bid up, round
          after round, until the shortage disappears.
        </p>
        <p>
          In software terms that process is a fixed-point search, and if you have trained a model
          you have seen it fail. In the market below, the price moves each round in proportion to
          excess demand, much as gradient descent moves a weight in proportion to the gradient. A
          small step homes in on the right price. Past a threshold, each correction overshoots by
          more than the error it was fixing, just as a learning rate set too high makes the loss
          explode.
        </p>

        <ErrorBoundary label="The market">
          <TimePath model={fixedPointModel} overrides={market.overrides} varId="p" periods={80} />
        </ErrorBoundary>
        <Controls
          model={fixedPointModel}
          overrides={market.overrides}
          onChange={market.set}
          controls={['lambda', 'a', 'b']}
          periods={1}
        />

        <div className="breakit">
          <span className="eyebrow">Break it</span>
          <p>
            From the default settings, set the adjustment speed to 0.5. Each correction now overshoots the error it corrects,
            the swings grow, and within a few rounds the search asks for a negative price and the
            run stops. When people say markets clear, they are quietly assuming prices adjust at a
            sensible speed relative to how sharply buyers and sellers respond. Above the threshold,
            the market never finds its price. Managers can do this without any maths: reprice hard
            on last week’s sales, or order capacity off this quarter’s shortage, and you can create
            the very swing you meant to remove.
          </p>
          <button type="button" onClick={() => {
              market.reset();
              market.set('lambda', 0.5);
            }}>
            set <MathText latex="\lambda" /> = 0.5
          </button>
          <button type="button" onClick={market.reset}>
            reset
          </button>
        </div>

        <h2 id="sorting">Which is which</h2>
        <p>
          If you take one habit from this chapter, take this one. For any statement about
          the economy, ask whether it is true by construction or a claim about how somebody
          behaves. An
          identity constrains every possible explanation and needs no defending. A behavioural rule
          is a claim someone could dispute, and disputing those claims is how economics makes
          progress.
        </p>
        <p>
          Here are eleven equations from across the book. Several use notation you have not met
          yet, and that is deliberate. You can sort most of them from their shape alone. Two or
          three will fool you, and those are the ones worth reading the explanation for.
        </p>

        <SortExercise id="ch0-sorting" items={SORT_ITEMS} />

        <p>
          Every model from here on is built out of these five pieces. Chapter 1 uses only two of
          them, identities and budget constraints, and gets far enough to say what must happen to
          the trade balance when a government borrows more.
        </p>

        <CaseFile
          part={1}
          title="A briefing note from Verano"
          anchor="case"
          question="Which of the Finance Minister's six statements could be disputed, and which could not?"
        >
          <p>
            Meet Verano, a middle-income island economy of two million workers, most of them employed by three large firms, and the running case
            for this book. Its government is about to debate a National Investment Plan, and the
            Finance Ministry has circulated a briefing note ahead of the debate.
          </p>
          <p>
            Like most briefing notes, it mixes two kinds of statement without saying which is
            which. Some lines could not possibly be false. Others are really bets on how people
            will behave. The debate that follows goes wrong exactly where those two get treated as
            the same kind of thing. Sort them before the politicians do.
          </p>
          <SortExercise id="case-verano-briefing" items={VERANO_BRIEFING} />
          <p>
            Keep the three assumptions in mind. By Part Four we will know which of them the plan
            really rests on, and the answer is fewer than the Ministry thinks.
          </p>
        </CaseFile>
      </main>

    </>
  );
}
