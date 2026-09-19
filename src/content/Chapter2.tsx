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

  return (
    <>
      <main className="prose">
        <span className="eyebrow">Chapter 2</span>
        <h1>A model of production</h1>
        <p className="lede">
          Chapter 1 established what cannot be false. This chapter adds the first thing that can be:
          a claim about what an economy is able to make, given what it has to work with.
        </p>

        <h2 id="technology">The production function</h2>
        <p>
          A <em>production function</em> maps inputs to the most output obtainable from them. The
          one used here combines capital and labour with an exponent on each, and multiplies the
          result by a productivity term that stands for everything else.
        </p>
        <p className="callout">
          <span className="mono">
            <MathText latex="Y = \bar{A}\,\bar{K}^{1/3}\,\bar{L}^{2/3}" />
          </span>
        </p>
        <p>
                    The exponents are not arbitrary, and the usual argument for them is weaker than it
          sounds. Under this form, with factors paid their marginal products, the shares of output
          going to capital and labour equal the exponents identically, for any exponents at all.
          Choosing one third because the observed share is one third is therefore calibration, not
          evidence: the fit is guaranteed and says nothing about whether the form is right.
        </p>
        <p>
          The real argument is about constancy. Factor shares have historically moved far less than
          the capital-labour ratio has, which is what makes an elasticity of substitution near one
          plausible, and that is the property this form has. Even that is now contested: measured
          labour shares have drifted down across most large economies since about 1980, and the
          value depends on how the earnings of the self-employed are split between labour and
          capital. A number this book relies on twice is one of the more actively disputed in the
          field.
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
          <Result model={productionModel} overrides={{ ...overrides, K: (overrides.K ?? productionModel.defaults.K!) * 2 }} of="Y" />. That is
          an increase of{' '}
          <Delta model={productionModel} from={overrides} to={{ ...overrides, K: (overrides.K ?? productionModel.defaults.K!) * 2 }}
            of="Y"
          />,
                    not of 100 percent. The exponent of one third explains all of it. Each addition to the
          capital stock produces less than the one before, because the labour it works with has not
          changed. That is <em>diminishing returns</em>: more of one input, with the others held
          fixed, buys progressively less.
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
          double. The function has <em>constant returns to scale</em>: a proportional increase in
          every input raises output in the same proportion. Diminishing returns apply to one input
          at a time; they say nothing about scaling everything at once.
        </p>

        <h2 id="shares">Factor payments</h2>
        <p>
                    Under competition, each factor is paid what the last unit of it produces — its{' '}
          <em>marginal product</em>. The return on capital equals the marginal product of capital,
          the wage equals the marginal product of labour, and both follow from the production
          function rather than from any bargaining story.
        </p>
        <p>
          Those payments exhaust output exactly. Not approximately — exactly, at every combination
          of inputs, as the invariant panel confirms while any slider moves. There is no residual
          left over to fight about and no shortfall to fund. The result is a mathematical property
          of constant returns rather than a claim about fairness, and it is worth being precise
          about which of those it is.
        </p>
        <p>
          The competitive assumption is doing real work here and it is contestable. Where employers
          face little competition for workers, wages fall below the marginal product, and the
          shortfall shows up as profit. The arithmetic above then still holds; what fails is the
          identification of the wage with the marginal product.
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
          Output per worker differs across countries by a factor of about thirty. Capital enters
          output through a cube root. Explaining a gap that size with capital alone therefore needs
          a capital gap of thirty cubed, which is{' '}
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
          times the capital per worker of another has only{' '}
          <Delta
            model={productionModel}
            from={{ ...overrides, K: 1000, L: 1000 }}
            to={{ ...overrides, K: 27_000, L: 1000 }}
            of="y"
            as="times"
            digits={0}
          />{' '}
          its output per worker.           Capital accounts for part of the gap in living standards, and the rest sits in the
          productivity term. That term is a residual, which makes it a measure of what the model
          does not explain rather than a thing the model has found.
        </p>
        <p>
          Two cautions about that residual, both of which cut against the reading this chapter
          invites. It is not all technology. Human capital belongs among the inputs and is missing here, and
          the standard decompositions that measure it — from schooling and from returns to
          experience — move a comparable slice out of the residual and into the factors. And
          because a more productive country accumulates more capital, some of what looks like
          capital&rsquo;s contribution is productivity arriving by another route. The honest
          summary is that capital intensity is the smallest of the three parts, human capital is
          comparable to it, and productivity is the largest without being the whole.
        </p>
        <p>
          That residual is the subject of most of modern growth economics. Naming it{' '}
          <MathText latex="\bar{A}" /> does not explain it.
        </p>

        <div className="breakit">
          <span className="eyebrow">Break it</span>
          <p>
                        Raise the capital exponent to 1 while leaving labour at two thirds. The exponents now
            sum to more than one, and factor payments come to five thirds of output: the economy
            pays out more than it makes. Two invariants fail together, and the model reports that
            its accounting no longer closes.
          </p>
          <p>
            A capital exponent of one is not only an error to be caught. It is the knife edge at
            which capital stops running into diminishing returns, and growth becomes something an
            economy can choose rather than something it converges to. Whether the exponent on capital broadly defined — including the human kind — is nearer
            one third or nearer one is a live dispute. It has a direct policy consequence: whether
            subsidising investment raises a country&rsquo;s growth rate permanently, or only its
            level.
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
                      Verano has two million workers — the panels count them in thousands — and a capital stock
          of <Result model={productionModel} overrides={VERANO_PRODUCTION} of="K" /> billion veral.
          Castellan, the neighbour across the strait, has the same workforce and eight times the
          capital per worker. Castellan&rsquo;s output per worker is four times Verano&rsquo;s, and the
            proposal treats that as an investment problem.
          </p>

                    <p>
            The output figure below is not a new assumption. It is the same number Chapter 1 reached
            by adding up what Verano spent, arrived at here from what Verano has to work with.
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
            Doubling the capital stock is a large undertaking for an economy this size. Diminishing
            returns decide what it buys.
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
                            . The gap with Castellan barely narrows. Capital was never most of it. Castellan
              holds eight times the capital per worker, which through a cube root accounts for a
              factor of two. The remaining factor of two is productivity, and the fund buys none of
              it. Note that the split is set by the calibration rather than discovered by it.
            </p>
            <p>
              Two different questions have been run together, and they have different answers. Does
              the fund pay? On these figures, yes, and handsomely: the rental rate on Veranese
              capital is{' '}
              <Result model={productionModel} overrides={VERANO_PRODUCTION} of="MPK" />, against a
              depreciation rate of six percent, so the net return comfortably exceeds anything
              Verano would plausibly borrow at. Does it close the gap with Castellan? No, and it
              cannot.
            </p>
            <p>
              Those numbers raise a harder question the chapter has now walked into. Capital in
              Verano earns{' '}
              <Result model={productionModel} overrides={VERANO_PRODUCTION} of="MPK" /> and capital
              in Castellan earns{' '}
              <Result model={productionModel} overrides={CASTELLAN_PRODUCTION} of="MPK" />. If a
              unit of capital earns twice as much on the poorer side of the strait, why has it not
              already moved there? Whatever the answer is, it is the same residual that the fund
              cannot buy.
            </p>
            <p>
              The proposal is not worthless. It is mis-specified. It targets the input that
              explains half the gap and costs the most, while the other half sits in a residual the
              model does not explain. What that residual contains — institutions, education,
              technology, the allocation of capital across firms rather than its quantity — is the
              subject of the chapters after this one.
            </p>
          </CaseAnswer>
        </CaseFile>

        <p>
          Nothing in this chapter changes over time. Capital is whatever it was set to, permanently,
          because no relation alters it. Chapter 3 adds the relation that does.
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
