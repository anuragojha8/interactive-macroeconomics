import { ErrorBoundary } from '../components/ErrorBoundary';
import { CaseAnswer, CaseFigures, CaseFile } from '../components/mdx/CaseFile';
import { Delta } from '../components/mdx/Delta';
import { Predict } from '../components/mdx/Predict';
import { Result } from '../components/mdx/Result';
import { MathText } from '../components/mdx/MathText';
import { ModelStage } from '../components/stage/ModelStage';
import { TracePanel } from '../components/stage/TracePanel';
import { ResponseCurve } from '../components/viz/ResponseCurve';
import { ShareLink } from '../components/book/ShareLink';
import { productionModel } from '../models/production';
import {
  CASTELLAN_PRODUCTION,
  VERANO_DOUBLED_CAPITAL,
  VERANO_PRODUCTION,
  VERANO_SOLOW,
} from '../case/verano';
import { useOverrides } from './useOverrides';

/** Relative to wherever the reader has left the slider, not to a fixed number. */
const doubleCapital = (overrides: Record<string, number>) => [
  {
    varId: 'K',
    to: (overrides.K ?? productionModel.defaults.K!) * 2,
    label: 'capital doubles',
  },
];

export function Chapter2(): JSX.Element {
  const { overrides, set, reset } = useOverrides(productionModel);
  const doubled = { ...overrides, K: (overrides.K ?? productionModel.defaults.K!) * 2 };
  // Verano with Castellan's capital but its own productivity: the part of the
  // gap that capital alone can close.
  const veranoWithCastellanCapital = { ...VERANO_PRODUCTION, K: CASTELLAN_PRODUCTION.K! };

  return (
    <>
      <main className="prose">
        <span className="eyebrow">Chapter 2</span>
        <h1>A model of production</h1>
        <p className="lede">
          Chapter 1 dealt in statements that cannot be false. This chapter adds the first one
          that can: a claim about how much an economy is able to make, given what it has to work
          with. It is a simple claim, and it turns out to explain less than most people expect,
          which is the most useful thing about it.
        </p>

        <h2 id="technology">The production function</h2>
        <p>
          A <em>production function</em> says how much output an economy can get from its inputs.
          The one used here takes capital (machines, buildings, roads) and labour (people at work),
          raises each to a power, and multiplies the result by a productivity term. That term
          stands for everything else that makes an economy productive, which is a larger category
          than economists like to admit.
        </p>
        <p className="callout">
          <span className="mono">
            <MathText latex="Y = \bar{A}\,\bar{K}^{1/3}\,\bar{L}^{2/3}" />
          </span>
        </p>
        <p>
          The exponents need defending, and the usual defence is weaker than it sounds. Under this
          form, with each input paid what its last unit produces, the share of output going to
          capital comes out equal to capital&rsquo;s exponent, and the same holds for labour. That
          happens for any exponents at all. So choosing one third because capital&rsquo;s observed
          share is about one third is calibration rather than evidence: the fit is guaranteed, and
          it says nothing about whether the form is right.
        </p>
        <p>
          The better argument is about stability. Over the last century the amount of capital per
          worker has multiplied many times over, while the split of income between capital and
          labour has moved far less. This form keeps the shares fixed however the inputs change,
          which is why it fits that history. Even that argument is now under pressure. Measured
          labour shares have drifted down across most large economies since about 1980, and the
          size of the drift depends on how you divide the earnings of the self-employed between
          their labour and their capital. So the number this book leans on twice is one of the more
          actively disputed in the field. It is worth knowing that before leaning on it.
        </p>

        <Predict
          id="ch2-double-capital"
          model={productionModel}
          overrides={overrides}
          shocks={doubleCapital(overrides)}
          question="Capital doubles from wherever it currently stands. Labour and productivity are unchanged."
          ask={[
            { varId: 'Y', label: 'Output' },
            { varId: 'MPK', label: 'The marginal product of capital' },
            { varId: 'w', label: 'The wage' },
          ]}
        />

        <p>
          Doubling capital raises output to{' '}
          <Result model={productionModel} overrides={doubled} of="Y" />, an increase of{' '}
          <Delta model={productionModel} from={overrides} to={doubled} of="Y" />. Twice the
          machines, nowhere near twice the output. The reason is that the new machines need people
          to run them, and there are no new people. Each addition to the capital stock produces
          less than the one before, because the same workforce is spread across more of it. That is{' '}
          <em>diminishing returns</em>: add more of one input while holding the others fixed, and
          each extra unit buys less than the last.
        </p>

        <ErrorBoundary label="The response of output to capital">
          <ResponseCurve
            model={productionModel}
            overrides={overrides}
            sweep="K"
            of="Y"
            from={0}
            to={6000}
            markAt={[1000, 2000]}
            title="Output against capital"
            subtitle="Labour and productivity held fixed. The bend is diminishing returns."
          />
        </ErrorBoundary>

        <p>
          Doubling capital and labour together is a different question, and the answer is exactly
          double. The function has <em>constant returns to scale</em>: raise every input in the
          same proportion and output rises in that proportion too. Build a second factory
          identical to the first, staff it the same way, and you get a second factory&rsquo;s
          output. Diminishing returns apply to one input at a time and say nothing about scaling
          everything at once.
        </p>

        <h2 id="shares">Factor payments</h2>
        <p>
          Now the question of who gets paid what. Under competition, each input is paid its{' '}
          <em>marginal product</em>, meaning what the last unit of it adds to output. The rental
          rate on capital equals the marginal product of capital, and the wage equals the marginal
          product of labour. Neither needs a story about bargaining. Both fall straight out of the
          production function once competition is assumed.
        </p>
        <p>
          Those payments use up output exactly, at every combination of inputs, and the invariant
          panel confirms it while any slider moves. Nothing is left over to fight about and nothing
          is missing that someone has to fund. Wage negotiations happen anyway, which tells you
          something about how far to trust the assumption. The exact fit itself is a mathematical
          property of constant returns, and it says nothing about fairness. It is worth being
          precise about which of those two things it is.
        </p>
        <p>
          The competitive assumption is doing real work here, and it can be contested. Where a few
          employers dominate a local job market, wages sit below the marginal product and the
          difference shows up as profit. The arithmetic above still holds in that case. What fails
          is the step that equates the wage with the marginal product, and nothing in the accounts
          can detect the failure, because nobody observes the marginal product directly.
        </p>

        <ErrorBoundary label="The causal trace">
          <TracePanel
            model={productionModel}
            shocks={doubleCapital(overrides)}
            overrides={overrides}
            period={0}
            periods={1}
          />
        </ErrorBoundary>

        <h2 id="development">Development accounting</h2>
        <p>
          Here is where the model earns its keep. Output per worker in the richest countries is
          thirty times or more what it is in the poorest. Could capital explain that? Capital
          enters output through a cube root, so a thirtyfold gap in output would need a gap in
          capital per worker of thirty cubed, which is{' '}
          <Delta
            model={productionModel}
            from={{ ...overrides, K: 1000, L: 1000 }}
            to={{ ...overrides, K: 27_000_000, L: 1000 }}
            of="k"
            as="ratio"
          />{' '}
          times as much. No such difference exists anywhere.
        </p>
        <p>
          Run it the other way. A country holding{' '}
          <Delta
            model={productionModel}
            from={{ ...overrides, K: 1000, L: 1000 }}
            to={{ ...overrides, K: 27_000, L: 1000 }}
            of="k"
            as="ratio"
          />{' '}
          times the capital per worker of another gets only{' '}
          <Delta
            model={productionModel}
            from={{ ...overrides, K: 1000, L: 1000 }}
            to={{ ...overrides, K: 27_000, L: 1000 }}
            of="y"
            as="times"
            digits={0}
          />{' '}
          its output per worker. Capital accounts for part of the gap in living standards, and
          the rest lands in the productivity term. That term is a residual: whatever is left after
          the inputs have been counted. It measures what the model fails to explain rather than
          something the model has found. The economist Moses Abramovitz called it a measure of our
          ignorance in 1956, and the description has aged well.
        </p>
        <p>
          Two cautions about that residual, and both cut against the reading this chapter invites.
          First, it includes more than technology. Skills and education, which economists call
          human capital, belong among the inputs and are missing here. The standard studies that
          measure human capital from schooling and work experience move a comparable slice of the
          gap out of the residual and into the inputs. Second, a more productive country also
          builds more capital, so some of what looks like capital&rsquo;s contribution is really
          productivity arriving by another route. The fair summary is that capital per worker is
          the smallest of the three parts, human capital is comparable to it, and productivity is
          the largest without being the whole story.
        </p>
        <p>
          That residual is the subject of most of modern growth economics. Calling it{' '}
          <MathText latex="\bar{A}" /> gives it a name, which is a start.
        </p>

        <div className="breakit">
          <span className="eyebrow">Break it</span>
          <p>
            Raise the capital exponent to 1 while leaving labour&rsquo;s where it is. The exponents
            now sum to more than one, and the payments stop adding up: capital&rsquo;s share of
            output comes to{' '}
            <Result model={productionModel} overrides={{ ...overrides, alphaK: 1 }} of="capitalShare" />{' '}
            and labour&rsquo;s to{' '}
            <Result model={productionModel} overrides={{ ...overrides, alphaK: 1 }} of="labourShare" />
            . The economy pays out more than it makes. Two invariants fail together, and the model
            reports that its accounting no longer closes.
          </p>
          <p>
            That setting is also more interesting than a mistake. At an exponent of one, capital
            stops running into diminishing returns, and growth becomes something an economy can
            choose rather than something it settles into. Whether the exponent on capital broadly
            defined, human capital included, is nearer one third or nearer one is a live dispute
            with a direct policy consequence. It decides whether subsidising investment raises a
            country&rsquo;s growth rate permanently, or only its level.
          </p>
          <button type="button" onClick={() => set('alphaK', 1)}>
            set <MathText latex="\alpha_K" /> = 1
          </button>
          <button type="button" onClick={reset}>
            reset
          </button>
          <ShareLink chapterId="ch2-production" modelId={productionModel.id} overrides={overrides} />
        </div>

        <CaseFile
          part={3}
          title="The sovereign fund proposal"
          anchor="case"
          question="Verano's opposition proposes borrowing enough to double the capital stock. How much larger would output be, and would it close the gap with Castellan?"
        >
          <p>
            Verano has two million workers (the panels count them in thousands) and a capital
            stock of <Result model={productionModel} overrides={VERANO_PRODUCTION} of="K" /> billion
            veral. Castellan, the neighbour across the strait, has the same workforce and{' '}
            <Delta
              model={productionModel}
              from={VERANO_PRODUCTION}
              to={CASTELLAN_PRODUCTION}
              of="k"
              as="ratio"
            />{' '}
            times the capital per worker. Its output per worker is{' '}
            <Delta
              model={productionModel}
              from={VERANO_PRODUCTION}
              to={CASTELLAN_PRODUCTION}
              of="y"
              as="ratio"
            />{' '}
            times Verano&rsquo;s. The opposition has looked at those two facts, put them together,
            and concluded that Verano&rsquo;s problem is a shortage of machines.
          </p>
          <p>
            One check before the numbers. Verano&rsquo;s output below comes from what the country
            has to work with, and it matches the figure Chapter 1 reached by adding up what Verano
            spent. Two routes, one number: the model is consistent with the accounts.
          </p>

          <CaseFigures
            model={productionModel}
            overrides={VERANO_PRODUCTION}
            show={[
              { varId: 'Y', label: 'Verano output' },
              { varId: 'y', label: 'Verano output per worker' },
              { varId: 'k', label: 'Verano capital per worker' },
              { varId: 'MPK', label: 'Return on capital' },
            ]}
          />
          <CaseFigures
            model={productionModel}
            overrides={CASTELLAN_PRODUCTION}
            show={[
              { varId: 'y', label: 'Castellan output per worker' },
              { varId: 'k', label: 'Castellan capital per worker' },
              { varId: 'A', label: 'Castellan productivity' },
            ]}
          />

          <p>
            Doubling the capital stock is an enormous undertaking for an economy this size, the
            kind of project that gets a ribbon-cutting ceremony every week for a decade. Diminishing
            returns decide what it actually buys.
          </p>

          <CaseAnswer>
            <p>Doubling capital raises Verano&rsquo;s output to:</p>
            <CaseFigures
              model={productionModel}
              overrides={VERANO_DOUBLED_CAPITAL}
              show={[
                { varId: 'Y', label: 'Output after the fund' },
                { varId: 'y', label: 'Output per worker' },
                { varId: 'MPK', label: 'Return on capital' },
              ]}
            />
            <p>
              Twice the capital buys{' '}
              <Delta
                model={productionModel}
                from={VERANO_PRODUCTION}
                to={VERANO_DOUBLED_CAPITAL}
                of="Y"
              />{' '}
              more output, and the return on capital falls by{' '}
              <Delta
                model={productionModel}
                from={VERANO_PRODUCTION}
                to={VERANO_DOUBLED_CAPITAL}
                of="MPK"
              />
              . The gap with Castellan barely narrows, because capital was never most of it. Give
              Verano all of Castellan&rsquo;s capital and, through the cube root, output per worker
              rises only{' '}
              <Delta
                model={productionModel}
                from={VERANO_PRODUCTION}
                to={veranoWithCastellanCapital}
                of="y"
                as="ratio"
              />{' '}
              times. The remaining factor of{' '}
              <Delta
                model={productionModel}
                from={veranoWithCastellanCapital}
                to={CASTELLAN_PRODUCTION}
                of="y"
                as="ratio"
              />{' '}
              is productivity, and the fund buys none of it. That split comes from the calibration,
              so treat it as an illustration of the method rather than a finding about Verano.
            </p>
            <p>
              Two questions have been run together here, and they have different answers. Does the
              fund pay? On these figures, yes, and handsomely: Veranese capital earns{' '}
              <Result model={productionModel} overrides={VERANO_PRODUCTION} of="MPK" /> a year
              before wear and tear, against a depreciation rate of{' '}
              <span className="mono result">{(VERANO_SOLOW.d! * 100).toFixed(0)}%</span>, which
              leaves a net return well above anything Verano could plausibly borrow at. Does it
              close the gap with Castellan? No, and it cannot.
            </p>
            <p>
              Those numbers lead somewhere awkward. Capital in Verano earns{' '}
              <Result model={productionModel} overrides={VERANO_PRODUCTION} of="MPK" /> and capital
              in Castellan earns{' '}
              <Result model={productionModel} overrides={CASTELLAN_PRODUCTION} of="MPK" />. If a
              unit of capital earns{' '}
              <Delta
                model={productionModel}
                from={CASTELLAN_PRODUCTION}
                to={VERANO_PRODUCTION}
                of="MPK"
                as="ratio"
              />{' '}
              times as much on the poorer side of the strait, why has Castellan&rsquo;s money not
              already crossed it? Whatever stops it is probably part of the same residual the fund
              cannot buy.
            </p>
            <p>
              So the proposal has value, aimed at the wrong target. It goes after the input that
              explains the smaller part of the gap and costs the most to acquire, while the larger
              part sits in a residual the model does not explain. What that residual contains
              (institutions, education, technology, and how well capital is allocated across firms
              rather than how much of it there is) is the subject of the chapters after this one.
            </p>
          </CaseAnswer>
        </CaseFile>

        <p>
          Nothing in this chapter changes over time. Capital stays wherever it was set, because no
          relation alters it. Chapter 3 adds the relation that does, and with it the first model
          that has a history.
        </p>
      </main>

      <ErrorBoundary label="The model stage">
        <ModelStage
          model={productionModel}
          overrides={overrides}
          onChange={set}
          controls={['A', 'K', 'L']}
          show={['Y', 'MPK', 'MPL', 'r', 'w', 'y', 'k', 'capitalShare', 'labourShare']}
          period={0}
          periods={0}
        />
      </ErrorBoundary>
    </>
  );
}
