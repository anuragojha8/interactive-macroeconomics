import { useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Term } from '../components/mdx/Term';
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

  const pct = (x: number) => `${Math.round(x * 100)}`;
  const planPoints = pct(VERANO_PLAN_RATE - VERANO_SOLOW.s!);
  const stormLoss = pct(1 - VERANO_AFTER_STORM.K! / VERANO_SOLOW.K!);
  const currentS = overrides.s ?? defaults.s!;
  const halfAgain = { ...overrides, s: Math.min(1, currentS * 1.5) };

  return (
    <>
      <main className="prose">
        <span className="eyebrow">Chapter 3</span>
        <h1>The Solow model</h1>
        <p className="lede">
          Every economy faces the same trade, every year: consume now, or build capacity that
          produces later. The Solow model states that trade in a single line and runs it forward.
          Robert Solow published it in 1956, it helped win him a Nobel prize, and nearly every
          argument about growth since has started from it.
        </p>

        <h2 id="accumulation">Adding one relation</h2>
        <p>
          Chapter 2 described an economy with no memory. Its capital stock held whatever value it
          was given, permanently, because nothing could build more or wear any out. This chapter
          adds the one relation that changes that. Each period a fixed share of output is set aside
          and becomes new capital, and a fixed share of the existing capital wears out. Capital is
          now a stock with a tap and a plughole, which is to say a bathtub, and Chapter 0 has
          already shown where bathtubs settle.
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
            Leave out Δt and the expression adds a stock to a flow, which the unit checker rejects.
            That rejection is deliberate. A quantity measured at a moment and a quantity measured
            per unit of time are different kinds of thing, and no algebra turns one into the other.
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
          Investment and consumption both move at once, and output stays exactly where it was. That
          surprises most people, and the reason is worth holding on to. This year&rsquo;s output
          is made with the capital already in place, and no decision taken this year can change
          that stock until next year. So the immediate effect of saving more is a change in how
          output is divided between consumption and investment, with the total unchanged. The
          country eats less today and has more machines tomorrow.
        </p>
        <p>
          Under the fixed investment rate assumed here, the division responds instantly and in
          proportion. That rule is an assumption about behaviour, and a strong one. Real households
          and firms decide how much to set aside, and those decisions move with interest rates,
          with the age of the population and with expectations about the future. The identity
          underneath holds regardless: output is either consumed or invested.
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
              Capital climbs until the new capital built each year exactly replaces what wears out.
              That level is the <Term>steady state</Term>: the stock at which the flows in and out
              cancel, so it stops changing. The simulation settles at{' '}
              <Result
                model={solowModel}
                overrides={overrides}
                of="K"
                at={PERIODS}
                periods={PERIODS}
              />
              . Solving the equations directly gives{' '}
              <span className="mono result">
                {steady.K.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              . The two agree to{' '}
              {agreement === 0 ? 'the last bit' : `${agreement.toExponential(1)} relative`}, which
              is the sort of check worth running on any model you intend to trust.
            </>
          ) : (
            <>
              With nothing wearing out, capital never stops climbing. The equations return no
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
        <p>
          The first chart shows why. Its curve is the new capital built each year, which bends
          because of diminishing returns, and its straight line is the capital wearing out, which
          rises in proportion to the stock. Where the two cross, the stock stops moving. The
          second chart shows the same journey as a path through time, and the year slider below
          lets you follow it.
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
          A higher investment rate raises the steady state, and leaves the long-run growth rate
          alone. Capital climbs faster for a while, reaches a higher resting level, and stops. With
          productivity and the workforce held fixed, as they are here, long-run growth in output
          per worker is zero at every investment rate. That is bad news for anyone hoping thrift
          alone could make a country grow forever, and it is one of the most important results in
          the book.
        </p>
        <p>
          The result rests on one assumption: that the capital exponent is below one, so each unit
          of capital adds less than the last. Whether that stays true once skills and knowledge are
          counted as capital too is the central disagreement in growth theory. Chapter 2&rsquo;s
          Break-it box was a first look at the other side of it.
        </p>
        <p>
          The gain is also smaller than intuition suggests. Raising the investment rate by half,
          from wherever it stands now, raises steady-state output per worker by{' '}
          <Delta
            model={solowModel}
            from={overrides}
            to={halfAgain}
            of="y"
            at={PERIODS}
            periods={PERIODS}
          />
          . The reason is familiar: the same diminishing returns that bent the curve in Chapter 2
          apply to every unit of the extra capital here.
        </p>

        <div className="breakit">
          <span className="eyebrow">Break it</span>
          <p>
            Set the depreciation rate to zero. Nothing wears out, so the steady state disappears,
            and the loop gain crosses one into amplifying. The convergence check and the
            loop analysis reach that conclusion independently, by different routes, which is
            reassuring.
          </p>
          <p>
            Capital never stops climbing, though it does slow down. It grows roughly with time
            raised to the power three halves, and the growth rate of output per worker still falls
            toward zero. The resting point has gone, and the diminishing returns are still there.
          </p>
          <p>
            The model has nothing to say about whether an economy could sustain this. It contains
            no resource limit, no population growth, and no price that would rise as capital became
            abundant. Its own arithmetic simply never settles, and that is a fact about the model
            rather than about any economy.
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
          question={`Verano proposes to raise its investment rate from ${pct(VERANO_SOLOW.s!)} percent to ${pct(VERANO_PLAN_RATE)} percent, permanently. What does the country get, and when?`}
        >
          <p>
            This is the plan behind the briefing note in Part One and the argument over the
            accounts in Part Two. It commits Verano to setting aside{' '}
            <span className="mono result">{planPoints}</span> more points of output every year,
            indefinitely. Consumption falls the day it starts, which the Ministry&rsquo;s
            presentation mentions on page forty.
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
            One thing to notice first: Verano is not at rest. Its capital stock is well below where
            its current investment rate would eventually take it, so output is already growing
            before the plan changes anything. That matters for judging the plan, because some of the
            growth its supporters will credit to it was going to happen anyway.
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
              Output does not move for a year. Consumption falls immediately, by the full{' '}
              <span className="mono result">{planPoints}</span> points of output the plan diverts.
              The country pays first and is paid back slowly.
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
              In the long run the plan raises output per worker by about{' '}
              <span className="mono result">{(planGain * 100).toFixed(1)}%</span>, and it delivers
              half of that gain around year{' '}
              <span className="mono result">{yearsToHalf}</span>. Long-run growth stays at zero,
              because a higher investment rate moves the resting point and leaves the trend alone. A
              minister who promises the plan will make Verano grow faster forever is promising
              something this model says cannot happen, whatever else the model gets wrong.
            </p>
            <p>
              Treat that timeline as optimistic. In this model the speed of convergence is set by
              the depreciation rate and the capital exponent, and for Verano it comes out at about{' '}
              <span className="mono result">
                {((1 - 1 / 3) * VERANO_SOLOW.d! * 100).toFixed(0)}%
              </span>{' '}
              of the remaining gap each year. Studies across real countries measure something
              closer to two percent, which gives a <Term>half-life</Term>, the time it takes to
              close half the gap, of about thirty-five years. A finance minister
              handed the model&rsquo;s timeline should be told it is the best case, and why.
            </p>
            <p>
              Consumption per worker ends up higher, and that was not guaranteed. Steady-state consumption is highest when the investment rate equals the capital
              exponent, a setting economists call the <Term>golden rule</Term>. Here that is one
              third, the same one third that bent the curve in Chapter 2. Verano starts
              below that rate, so the plan moves it toward the best rate rather than past it.
            </p>
            <p>
              The two directions are not symmetric. A country that invests more than the capital
              exponent is <Term>dynamically inefficient</Term>: cutting its investment rate would raise
              consumption in every period, with nobody worse off at any date. Below that rate there
              is no such free lunch. Raising investment always costs the present generation
              something to benefit a later one, and how to weigh the two is a question about whom
              you care about, which no arithmetic can answer.
            </p>
            <p>
              Now back to the briefing note in Part One. Of its three assumptions, only one carries
              any weight here. The fixed investment rate drives everything above. The wage
              assumption changes who receives the output, but not how much of it there is: the
              causal trace shows the wage as a leaf that nothing else depends on. And the claim that
              firms invest more when the return on capital is higher does not appear in this model
              at all, because nothing here lets the return on capital feed back into investment.
            </p>
            <p>
              That third gap is the plan&rsquo;s largest unmeasured risk. Verano is being advised
              to double down on capital by a model in which the falling return on that capital
              cannot discourage anyone from supplying it. In a real economy it would, and the plan
              would have to be enforced against the very incentive it is creating.
            </p>
          </CaseAnswer>
        </CaseFile>

        <CaseFile
          part={5}
          title="The storm"
          question={`A hurricane destroys ${stormLoss} percent of Verano's capital stock overnight. How long until the country is back where it started?`}
        >
          <p>
            Nothing else changes: the same people, the same skills, the same institutions and the
            same investment rate. Only the capital is gone.
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
              fastest at the start. Investment does not rise to make that happen. It is a fixed
              share of output, and output has fallen. What changes is that the same investment is
              now a larger fraction of a smaller capital stock, so the stock grows at a faster rate
              from further down.
            </p>
            <p>
              Output falls by much less than capital does. Losing{' '}
              <span className="mono result">{stormLoss}%</span> of the capital stock costs Verano{' '}
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
              The model has nothing to say about the people the storm killed, the homes it
              destroyed, or whether the rebuilt capital is as good as what it replaced. It tracks
              one quantity and recovers it. Reading that as a claim that hurricanes do not matter
              would be a misuse of the model.
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
