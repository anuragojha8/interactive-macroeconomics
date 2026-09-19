import { useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MathText } from '../components/mdx/MathText';
import { CaseAnswer, CaseFigures, CaseFile } from '../components/mdx/CaseFile';
import { Delta } from '../components/mdx/Delta';
import { Predict } from '../components/mdx/Predict';
import { Result } from '../components/mdx/Result';
import { CodeReveal } from '../components/stage/CodeReveal';
import { ModelStage } from '../components/stage/ModelStage';
import { TracePanel } from '../components/stage/TracePanel';
import { PhaseDiagram } from '../components/viz/PhaseDiagram';
import { TimePath } from '../components/viz/TimePath';
import { ShareLink } from '../components/book/ShareLink';
import { solveDynamic } from '../engine/solve';
import type { Shock } from '../engine/types';
import { solowModel, solowSteadyState } from '../models/solow';
import {
  VERANO_AFTER_STORM,
  VERANO_PLAN_RATE,
  VERANO_SOLOW,
} from '../case/verano';
import { useOverrides } from './useOverrides';

const PERIODS = 500;
/** Ten points on top of wherever the reader has left the rate. */
const savingShock = (overrides: Record<string, number>): Shock[] => [
  {
    varId: 's',
    to: Math.min(1, (overrides.s ?? solowModel.defaults.s!) + 0.1),
    label: 'the investment rate rises by ten points',
  },
];

export function Chapter3(): JSX.Element {
  const { overrides, set, reset } = useOverrides(solowModel);
  const [period, setPeriod] = useState(0);

  const defaults = solowModel.defaults;
  const steady = solowSteadyState({
    A: overrides.A ?? defaults.A!,
    L: overrides.L ?? defaults.L!,
    s: overrides.s ?? defaults.s!,
    d: overrides.d ?? defaults.d!,
  });
  const settled = solveDynamic(solowModel, { overrides, periods: PERIODS });
  const simulatedK = settled.path![PERIODS]!.K!;
  const closedFormExists = Number.isFinite(steady.K);
  const agreement = closedFormExists
    ? Math.abs(simulatedK - steady.K) / Math.max(Math.abs(steady.K), 1e-300)
    : Number.NaN;
  const chartMax = Math.max(...settled.path!.map((p) => p.K!)) * 1.35;

  // Verano, worked out by the same engine that runs the chapter.
  const veranoNow = solowSteadyState({
    A: VERANO_SOLOW.A!,
    L: VERANO_SOLOW.L!,
    s: VERANO_SOLOW.s!,
    d: VERANO_SOLOW.d!,
  });
  const veranoPlan = solowSteadyState({
    A: VERANO_SOLOW.A!,
    L: VERANO_SOLOW.L!,
    s: VERANO_PLAN_RATE,
    d: VERANO_SOLOW.d!,
  });
    const planGain = veranoPlan.y / veranoNow.y - 1;
  const planPath = solveDynamic(solowModel, {
    overrides: { ...VERANO_SOLOW, s: VERANO_PLAN_RATE },
    periods: 200,
  }).path!;
  const basePath = solveDynamic(solowModel, {
    overrides: VERANO_SOLOW,
    periods: 200,
  }).path!;
  // Measured against the path Verano was already on. Comparing the plan's path
  // to the midpoint between the two steady states counts the climbing the
  // country would have done anyway, which is the error this chapter warns
  // against and then, in an earlier draft, committed.
  const longRunGain = veranoPlan.y - veranoNow.y;
  const yearsToHalf = planPath.findIndex(
    (p, i) => p.y! - basePath[i]!.y! >= longRunGain / 2,
  );
  const stormPath = solveDynamic(solowModel, {
    overrides: VERANO_AFTER_STORM,
    periods: 200,
  }).path!;
  const yearsToRecover = stormPath.findIndex((p) => p.K! >= VERANO_SOLOW.K!);

  return (
    <>
      <main className="prose">
        <span className="eyebrow">Chapter 3</span>
        <h1>The Solow model</h1>
        <p className="lede">
          Every economy faces one trade: consume now, or build capacity that produces later. The
          Solow model states that trade as a single line of state and runs it forward.
        </p>

        <h2 id="accumulation">Adding one relation</h2>
        <p>
          Chapter 2 described an economy without memory. Its capital stock held whatever value it
          was given, permanently, because no relation could change it. This chapter adds one
          relation. A fixed share of output becomes next period&rsquo;s capital, and a fixed share
          of existing capital wears out each period.
        </p>

        <div className="equation">
          <span className="eyebrow equation__kind">accumulation · P1</span>
          <span className="mono equation__body">
            <MathText
              latex={solowModel.relations.find((r) => r.id === 'capital-accumulation')!.latex}
            />
          </span>
          <CodeReveal
            relation={solowModel.relations.find((r) => r.id === 'capital-accumulation')!}
            variables={new Map(solowModel.variables.map((v) => [v.id, v]))}
          />
          <p className="equation__note">
            Without Δt the expression adds a stock to a flow. The unit checker rejects it. That
            rejection is the point. A quantity measured at a moment and a quantity measured per unit
            of time are different kinds of thing, and no algebra reconciles them.
          </p>
        </div>

        <Predict
          id="ch3-saving"
          model={solowModel}
          overrides={overrides}
          shocks={savingShock(overrides)}
          question="The investment rate rises by ten points from wherever it currently stands. Judge each at the moment the change is made."
          ask={[
            { varId: 'Y', label: 'Output, this period', at: 0 },
            { varId: 'C', label: 'Consumption, this period', at: 0 },
            { varId: 'K', label: 'Capital, next period', at: 1 },
          ]}
        />

        <p>
          Investment and consumption both move at once. Output does not. Production depends on the
          capital already in place, and no decision taken this period alters that stock. The
          immediate effect is a change in how output is divided, not in how much of it there is.
        </p>
        <p>
          Under the fixed investment rate assumed here, the division responds instantly and
          proportionally. That rule is an assumption, not an accounting statement. Households and
          firms choose how much to set aside, and the choice responds to interest rates,
          demographics and expectations. The identity beneath it holds regardless. Output is either
          consumed or invested.
        </p>

        <ErrorBoundary label="The causal trace">
          <TracePanel
            model={solowModel}
            shocks={savingShock(overrides)}
            overrides={overrides}
            period={0}
            periods={2}
          />
        </ErrorBoundary>

        <h2 id="steady-state">The resting point</h2>
        <p>
          {closedFormExists ? (
            <>
              Capital climbs until construction and depreciation match exactly. That level is the{' '}
              <em>steady state</em>: the stock at which the flows into it and out of it cancel, so
              it stops changing. Simulation settles at{' '}
              <Result
                model={solowModel}
                overrides={overrides}
                of="K"
                at={PERIODS}
                periods={PERIODS}
              />
              . The closed form gives{' '}
              <span className="mono result">
                {steady.K.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              . The two agree to{' '}
              {agreement === 0 ? 'the last bit' : `${agreement.toExponential(1)} relative`}.
            </>
          ) : (
            <>
              With nothing wearing out, capital never stops climbing. The closed form returns no
              steady state, and after {PERIODS} periods the simulation stands at{' '}
              <Result
                model={solowModel}
                overrides={overrides}
                of="K"
                at={PERIODS}
                periods={PERIODS}
              />{' '}
              and rising. Algebra and simulation agree that there is nothing to converge to.
            </>
          )}
        </p>

        <div className="charts">
          <ErrorBoundary label="The phase diagram">
            <PhaseDiagram
              model={solowModel}
              overrides={overrides}
              stock="K"
              inflow="I"
              outflow="depreciation"
              max={chartMax}
            />
          </ErrorBoundary>
          <ErrorBoundary label="The time path">
            <TimePath
              model={solowModel}
              overrides={overrides}
              varId="K"
              periods={120}
              focus={period}
            />
          </ErrorBoundary>
        </div>

        <label className="scrub">
          <span className="mono scrub__label">year {period}</span>
          <input
            type="range"
            min={0}
            max={120}
            step={1}
            value={period}
            aria-label="Year to inspect"
            onChange={(e) => setPeriod(Number(e.target.value))}
          />
        </label>

        <h2 id="saving">Why saving more does not raise output today</h2>
        <p>
                    A higher investment rate raises the steady state. It does not raise the growth rate.
          Capital climbs faster for a while, reaches a higher resting level, and stops. With
          productivity and the workforce held fixed, as they are here, long-run growth in output
          per worker is zero at every investment rate. Whatever explains sustained growth, it is
          not thrift.
        </p>
        <p>
          That result is not a fact about economies. It follows from the capital exponent being
          below one, which is what makes each unit of capital add less than the last. Whether that exponent really is below one, once human capital and knowledge are counted
          as capital too, is the central disagreement in growth theory. Chapter 2&rsquo;s
          &ldquo;break it&rdquo; was a first look at the other side of it.
        </p>
        <p>
          The gain is also smaller than intuition suggests. Raising the investment rate by half
          raises steady-state output per worker by{' '}
          <Delta
            model={solowModel}
            from={overrides}
            to={{ ...overrides, s: 0.3 }}
            of="y"
            at={PERIODS}
            periods={PERIODS}
          />
          . The reason is familiar. Diminishing returns bend the curve in Chapter 2, and they apply
          to every unit of the extra capital here.
        </p>

        <div className="breakit">
          <span className="eyebrow">Break it</span>
          <p>
            Set the depreciation rate to zero. Nothing wears out, so the steady state disappears,
            and the loop gain crosses one into <em>amplifying</em>. The convergence check and the
            loop analysis reach that conclusion independently, by different routes.
          </p>
                      <p>
              Capital never stops climbing, though it does slow: it grows roughly as the three-halves
              power of time, and the growth rate of output per worker still falls toward zero. What
              has gone is the resting point, not the diminishing returns.
            </p>
            <p>
              The model has nothing to say about whether an economy could sustain this. It contains
              no resource limit, no population growth, and no price that would rise as capital
              became abundant. Its own arithmetic never settles. That is a fact about the model, and
              not about any economy.
            </p>
          <button type="button" onClick={() => set('d', 0)}>
            set <MathText latex="\bar{d}" /> = 0
          </button>
          <button type="button" onClick={reset}>
            reset
          </button>
          <ShareLink chapterId="ch3-solow" modelId={solowModel.id} overrides={overrides} />
        </div>

        <CaseFile
          part={4}
          title="The National Investment Plan"
          anchor="case"
          question="Verano proposes to raise its investment rate from 18 percent to 28 percent, permanently. What does the country get, and when?"
        >
          <p>
            The plan is the reason for the briefing note in Part One and the argument over the
            accounts in Part Two. It commits Verano to setting aside ten more points of output every
            year, indefinitely. Consumption falls the day it starts.
          </p>

          <CaseFigures
            model={solowModel}
            overrides={VERANO_SOLOW}
            at={0}
            periods={1}
            show={[
              { varId: 'K', label: 'Capital today' },
              { varId: 'Y', label: 'Output today' },
              { varId: 'C', label: 'Consumption today' },
              { varId: 'y', label: 'Output per worker' },
            ]}
          />

          <p>
            Verano currently rests nowhere. Its capital stock is far below where its own investment
            rate would eventually take it, so output is growing before the plan changes anything.
            That matters for judging the plan, because some of what its supporters attribute to it
            was going to happen regardless.
          </p>

          <Predict
            id="case-verano-plan"
            model={solowModel}
            overrides={VERANO_SOLOW}
            shocks={[{ varId: 's', to: VERANO_PLAN_RATE, label: 'the plan begins' }]}
            question="The plan begins this year. Judge each in the year it starts."
            ask={[
              { varId: 'Y', label: 'Veranese output, this year', at: 0 },
              { varId: 'C', label: 'Veranese consumption, this year', at: 0 },
              { varId: 'K', label: 'Veranese capital, next year', at: 1 },
            ]}
          />

          <CaseAnswer>
            <p>
              Output does not move for a year. Consumption falls immediately, by the full ten points
              of output the plan diverts. The country pays first and is paid back slowly.
            </p>
            <p>Where the plan eventually takes Verano, against where it was already going:</p>
            <CaseFigures
              model={solowModel}
              overrides={{ ...VERANO_SOLOW, s: VERANO_PLAN_RATE }}
              at={200}
              periods={200}
              show={[
                { varId: 'K', label: 'Capital, with the plan' },
                { varId: 'Y', label: 'Output, with the plan' },
                { varId: 'y', label: 'Output per worker, with the plan' },
                { varId: 'c', label: 'Consumption per worker, with the plan' },
              ]}
            />
            <CaseFigures
              model={solowModel}
              overrides={VERANO_SOLOW}
              at={200}
              periods={200}
              show={[
                { varId: 'K', label: 'Capital, without it' },
                { varId: 'Y', label: 'Output, without it' },
                { varId: 'y', label: 'Output per worker, without it' },
                { varId: 'c', label: 'Consumption per worker, without it' },
              ]}
            />
            <p>
                            The half-life below is the model&rsquo;s, and the model converges faster than
              economies do. Convergence here runs at one minus the capital exponent times the
              depreciation rate; the rate measured across countries is closer to two percent a
              year, with a half-life nearer thirty-five years. A finance minister handed this
              timeline should be told it is optimistic, and why.
            </p>
            <p>
              The plan raises output per worker in the long run by about{' '}
              <span className="mono result">{(planGain * 100).toFixed(1)}%</span>, and reaches half
              of that gain around year{' '}
              <span className="mono result">{yearsToHalf}</span>. Long-run growth is unchanged at
              zero, because a higher investment rate moves the resting point and not the trend. A
              minister who promises the plan will make Verano grow faster forever is promising
              something this model says is impossible, whatever else it gets wrong.
            </p>
            <p>
                            Consumption per worker is higher in the end. That was not guaranteed. Steady-state consumption is highest when the investment rate equals the capital
              exponent. That is one third here, the same one third that bent the curve in Chapter 2.
              Verano sits below it, so the plan moves toward that rate rather than past it.
            </p>
            <p>
              The two directions are not symmetric. A country investing more than the capital
              exponent is <em>dynamically inefficient</em>: cutting its investment rate would raise
              consumption in every period, with no one worse off at any date. Below that rate there
              is no such free move. Raising investment always costs the present generation to
              benefit a later one, which is a question about who counts rather than about
              arithmetic.
            </p>
            <p>
                            Of the three assumptions in the briefing note, only one is load-bearing here. The
              fixed investment rate drives everything above. The wage assumption changes who
              receives the output, not how much of it there is — the causal trace shows the wage as
              a leaf that nothing else depends on. And the claim that firms invest more when the
              return on capital is higher is not in this model at all: nothing here lets the return
              on capital feed back into investment.
            </p>
            <p>
              That third gap is the plan&rsquo;s largest unquantified risk. Verano is being advised
              to double down on capital by a model with no channel through which the falling return
              on that capital could discourage anyone from supplying it.
            </p>
          </CaseAnswer>
        </CaseFile>

        <CaseFile
          part={5}
          title="The storm"
          question="A hurricane destroys two fifths of Verano's capital stock overnight. How long until the country is back where it started?"
        >
          <p>
            Nothing else changes: the same people, the same skills, the same institutions, the same
            investment rate. Only the capital is gone.
          </p>
          <CaseFigures
            model={solowModel}
            overrides={VERANO_AFTER_STORM}
            at={0}
            periods={1}
            show={[
              { varId: 'K', label: 'Capital after the storm' },
              { varId: 'Y', label: 'Output after the storm' },
              { varId: 'MPK', label: 'Return on capital' },
            ]}
          />
          <CaseAnswer>
            <p>
                            Capital returns to its pre-storm level in about{' '}
              <span className="mono result">{yearsToRecover}</span> years, and the recovery is
              fastest at the start. The reason is not that investment rises. Investment is a fixed share of output, and output
              has fallen. It is that the same investment is a larger fraction of a smaller capital
              stock, so the stock grows at a faster rate from further down.
            </p>
            <p>
              Output falls by much less than capital does. Losing two fifths of the capital stock
              costs Verano{' '}
              <Delta
                model={solowModel}
                from={VERANO_SOLOW}
                to={VERANO_AFTER_STORM}
                of="Y"
                at={0}
                periods={1}
              />{' '}
              of its output, because output depends on capital through a cube root. The arithmetic
              cuts both ways. What made the sovereign fund disappointing in Part Three makes the
              hurricane survivable here.
            </p>
            <p>
              The model has nothing to say about the people the storm killed, the housing it
              destroyed, or whether the rebuilt capital is the same capital. It describes one
              quantity and recovers it. Reading that as a claim that hurricanes do not matter would
              be a misuse of it.
            </p>
          </CaseAnswer>
        </CaseFile>
      </main>

      <ErrorBoundary label="The model stage">
        <ModelStage
          model={solowModel}
          overrides={overrides}
          onChange={set}
          controls={['s', 'd', 'A']}
          show={['K', 'Y', 'I', 'depreciation', 'C', 'MPK', 'r', 'y', 'c']}
          period={period}
          periods={PERIODS}
        />
      </ErrorBoundary>
    </>
  );
}
