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
    because: 'Every unit of output was bought by somebody. The equation defines how the total is assembled.',
  },
  {
    id: 'consumption',
    latex: 'C = (1 - \\bar{s})Y',
    answer: 'assumption' as const,
    because: 'Households could set aside any fraction they liked. A constant one is a claim about behaviour.',
  },
  {
    id: 'balance',
    latex: 'A = L + E',
    answer: 'accounting' as const,
    because: 'Equity is defined as assets less liabilities, so the equation cannot fail.',
  },
  {
    id: 'investment',
    latex: 'I = \\bar{s}Y',
    answer: 'assumption' as const,
    because: 'The same claim as the consumption rule, stated from the other side.',
  },
  {
    id: 'rental',
    latex: 'r = MPK',
    answer: 'assumption' as const,
    because: 'True under competition. Where firms have market power, factors are paid less than their marginal product.',
  },
    {
    id: 'accumulation',
    latex: 'K_{t+1} = K_t + I_t - D_t',
    answer: 'accounting' as const,
    because:
      'Given what investment and depreciation mean, next period’s stock follows. All the behaviour sits in what sets I and D.',
  },
  {
    id: 'depreciation',
    latex: 'D_t = \\bar{d}K_t',
    answer: 'assumption' as const,
    because:
      'Constant geometric depreciation is a modelling choice, and a poor one for many assets. Buildings, vehicles and software do not wear out on the same schedule.',
  },
  {
    id: 'demand',
    latex: 'D = a - b\\,p',
    answer: 'assumption' as const,
    because: 'A claim about how buyers respond to price, and a strong one: the response is linear.',
  },
  {
    id: 'per-worker',
    latex: 'y = Y / \\bar{L}',
    answer: 'accounting' as const,
    because: 'A definition. Output per worker is output divided by workers, and nothing else.',
  },
  {
    id: 'net-lending',
    latex: 'S_p + S_g - I = NX',
    answer: 'accounting' as const,
    because: 'Follows from the expenditure identity and the definitions of saving. It constrains every explanation of a trade deficit.',
  },
  {
    id: 'thermostat',
    latex: 'h = h_{max} \\text{ if } T < T^*',
    answer: 'assumption' as const,
    because: 'A control rule. The physics of the room is unaffected by which rule is chosen.',
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
          Macroeconomics is usually taught as a collection of diagrams to be recognised. It is
          smaller than that. Five ideas generate everything in this book, and none of them is about
          economics.
        </p>

        <p>
          The five are stocks and flows, accounting identities, budget constraints, behavioural
          rules, and market clearing. Each appears below in a system with no money in it. The
          variables come later. Once the machinery is familiar, the economics is a matter of naming
          them.
        </p>

        <h2 id="stocks">Stocks and flows</h2>
        <p>
          A <em>stock</em> is a quantity measured at a moment: water in a tub, capital in an
          economy, money in an account. A <em>flow</em> is a quantity measured per unit of time: the
          tap,           annual investment, monthly salary. The distinction is not pedantry. A debt is a stock and
          a deficit is a flow, and most of what goes wrong in public argument about either comes
          from adding them together.
        </p>
        <p>
          The tub below fills from a tap and drains in proportion to how full it is. Raise the tap
          and the level rises, but not without limit: a fuller tub drains faster, and the level
          settles where the two flows match.
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
                    That resting level is not a discovery about tubs. It is the arithmetic of that particular
          drain rule: the level settles at inflow divided by the drain rate, and the same arithmetic
          governs a capital stock, a population, a debt and an inventory. Change the rule — a real
          plughole drains closer to the square root of the depth — and the resting level moves, but
          the reason there is one does not.
        </p>

        <h2 id="identities">Identities and budget constraints</h2>
        <p>
          An <em>identity</em> is an equation that holds by construction, because of how its terms
          are defined. It cannot be tested, refuted, or repealed. A <em>budget constraint</em> is
          the identity that sources of funds equal uses of funds, applied to one party over one
          period.
        </p>
        <p>
                    The books below belong to a lemonade stand. Assets equal liabilities plus equity because
          every transaction is recorded twice, once as a source of funds and once as a use, so a
          single-sided edit is not a change to the business but a bookkeeping error.           Change one entry. The identity does not fail — it cannot — so the books stop balancing
          instead, and the panel lists the changes that would each make them balance again. There is
          always more than one.
        </p>

        <ErrorBoundary label="The ledger">
          <ReconcilePanel model={ledgerModel} overrides={ledger.overrides} onChange={ledger.set} />
        </ErrorBoundary>

        <h2 id="rules">Behavioural rules</h2>
        <p>
          A <em>behavioural rule</em> states what somebody does. It is the only kind of statement in
          a model that can be wrong, and therefore the only kind worth arguing about.
        </p>
        <p>
          Three thermostats follow. The room is identical in all three. Heat leaks in proportion to the gap between inside
                    and outside, and that relation is literally the same one in all three models. Only the
          control rule differs.
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
          Constant heat ignores the target and holds the room at whatever temperature balances the
          leak. On/off control never rests; it overshoots, switches off, undershoots, and repeats.
          Proportional control settles short of the target and stays there, because at the target it
          calls for no heat while the room is still losing some. That gap is not a fault in the
          thermostat. It is what the rule does.
        </p>
        <p>
                    Every monetary and fiscal rule later in this book has one of these three shapes. Swapping
          the rule changes what the system does without changing anything else in it.
        </p>

        <h2 id="clearing">Market clearing</h2>
        <p>
          <em>Market clearing</em> means a price at which the quantity demanded equals the quantity
          supplied. Stated that way it is a definition. Stated as something that happens, it is an
          assumption about a process — that a price which is too low gets bid up, repeatedly, until
          the gap closes.
        </p>
        <p>
          That process is a fixed-point search. Below, the price moves each round in proportion to
          excess demand. Raise the adjustment speed past a threshold and the search overshoots by
          more than it corrects, and the price never settles at all.
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
                        Set the adjustment speed to 0.5. Each correction is now larger than the error it
            corrects, the swings grow, and within a few rounds the search asks for a negative price
            and the run stops. Market clearing is an assumption about how fast prices adjust
            relative to how sharply quantities respond. Above the threshold, the process this chapter described never arrives anywhere.
          </p>
          <button type="button" onClick={() => market.set('lambda', 0.5)}>
            set <MathText latex="\lambda" /> = 0.5
          </button>
          <button type="button" onClick={market.reset}>
            reset
          </button>
        </div>

        <h2 id="sorting">Which is which</h2>
        <p>
                    Of everything in this chapter, one distinction does the most work: whether a statement is
          true by construction, or is a claim about how somebody behaves. An identity constrains any
          account of the data and takes no defending. A behavioural rule is a claim someone could
          dispute, and disputing it is how economics makes progress.
        </p>
        <p>
                    Eleven equations follow, drawn from across the book. Each is either true by construction
          or a claim someone could dispute. Several use notation from chapters not yet read, which
          does not matter: sorting them does not require knowing what the symbols mean.
        </p>

        <SortExercise id="ch0-sorting" items={SORT_ITEMS} />

        <p>
          Every model from here on is assembled from these five pieces. Chapter 1 uses two of them
          and no others, and gets further than that restriction suggests.
        </p>

        <CaseFile
          part={1}
          title="A briefing note from Verano"
          anchor="case"
          question="Which of the Finance Minister's six statements could be disputed, and which could not?"
        >
          <p>
            Verano is a middle-income island economy of two million workers. Its Finance Ministry
            has circulated a briefing note ahead of a debate on a National Investment Plan. The note
            mixes two kinds of statement without distinguishing them. That is normal practice. It is
            also the source of most of the confusion in the debate that follows.
          </p>
          <p>
                        The note mixes the two kinds without marking which is which, and that is where the
            debate goes wrong. A line that could not be false and a line that could be are being
            weighed as though they were the same sort of thing.
          </p>
          <SortExercise id="case-verano-briefing" items={VERANO_BRIEFING} />
          <p>
            The three assumptions reappear in Part Four, where the plan depends on all of them at
            once. The three identities will still be true whatever happens to Verano.
          </p>
        </CaseFile>
      </main>

    </>
  );
}
