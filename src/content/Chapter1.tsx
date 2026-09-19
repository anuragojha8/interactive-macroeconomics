import { ErrorBoundary } from '../components/ErrorBoundary';
import { CaseAnswer, CaseFigures, CaseFile } from '../components/mdx/CaseFile';
import { Delta } from '../components/mdx/Delta';
import { Result } from '../components/mdx/Result';
import { ModelStage } from '../components/stage/ModelStage';
import { ReconcilePanel } from '../components/stage/ReconcilePanel';
import { ShareLink } from '../components/book/ShareLink';
import { circularFlowModel } from '../models/circularFlow';
import { VERANO_ACCOUNTS, VERANO_PUBLISHED } from '../case/verano';
import { useOverrides } from './useOverrides';

export function Chapter1(): JSX.Element {
  const { overrides, set, reset } = useOverrides(circularFlowModel);

  return (
    <>
      <main className="prose">
        <span className="eyebrow">Chapter 1</span>
        <h1>Measuring the macroeconomy</h1>
        <p className="lede">
                    Before any theory arrives, some statements about an economy are already true. They follow
          from how the quantities are defined, and they constrain every explanation anyone will
          offer for anything that happens.
        </p>

        <h2 id="circular-flow">The circular flow</h2>
        <p>
                    Gross domestic product is the market value of everything an economy produces in a year,
          and it can be counted three ways: as everything bought, as everything earned, or as
          everything produced. The three totals are the same number counted at different points in
          a circle. Spending lands in somebody&rsquo;s income.
        </p>
        <p>
          Only two of the three appear below. The third adds up the value each producer adds rather than the value it sells. It answers
          an objection that is already forming: if a mill sells steel to a carmaker, and the car is
          counted, has the steel been counted twice? It has not. Only the value added at each step
          enters the total, and that convention is what makes the first identity exactly true rather
          than roughly true.
        </p>
        <p>
          The expenditure side splits output into consumption, investment, government purchases and
          net exports. The income side splits the same total into wages, profits and net taxes. The
          panel currently reports{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Y" /> by spending and{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Yincome" /> by income.
        </p>

        <ErrorBoundary label="The circular flow">
          <ReconcilePanel model={circularFlowModel} overrides={overrides} onChange={set} />
        </ErrorBoundary>

        <p>
          Raise government purchases on the right without touching anything else. Spending rises,
          income does not, and the two measures of output disagree. The           panel names the identity the figures violate and lists the changes that would each make
          them consistent again. Somebody had to earn the extra amount. The model does not care
          who.
        </p>
        <p>
          This is the general lesson of the chapter. A single flow cannot be changed in isolation,
          because every flow is simultaneously an outgoing for one party and an incoming for
          another. The arrows have two ends.
        </p>

        <h2 id="balances">Sector balances</h2>
        <p>
          Private saving is income after tax that households did not spend. Public saving is taxes less purchases. Subtract investment from the sum and what remains is net
          lending to the rest of the world, which equals the trade balance:
        </p>
        <p className="callout">
          <span className="mono">S_p + S_g − I = NX</span>
        </p>
        <p>
          The current calibration gives private saving of{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Sprivate" />, public saving of{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Spublic" />, and investment of{' '}
          <Result model={circularFlowModel} overrides={overrides} of="I" />. Net lending is
          therefore{' '}
          <Result model={circularFlowModel} overrides={overrides} of="netLending" />, and the trade
          balance is the same number.
        </p>
        <p>
          A trade deficit is an accounting statement about saving and investment before it is
          anything else. A country running one has invested more than it saved and borrowed the
          difference from abroad. Whether that is a problem depends on what the investment bought. The identity does
          not settle it.
        </p>
        <p>
                    Rearrange the same identity into three sector balances — private, government and
          foreign — and they sum to exactly zero. One sector runs a surplus only if another runs a
          deficit. A government promising to cut its own deficit while households save more and the
          trade balance holds is promising arithmetic that does not exist.
        </p>

        <h2 id="real-nominal">Real and nominal</h2>
        <p>
          Output measured at current prices is <em>nominal</em>. Divide by a price index and what
          remains is <em>real</em> output, which tracks quantities rather than prices. The index is
          set to 100 in a base year, and the choice of base year is arbitrary.
        </p>
        <p>
                    The choice changes levels. Under the single fixed set of base-year prices assumed here,
          it leaves growth rates alone: two accounts of the same history, based on different years,
          disagree about how large the economy was and agree exactly about how fast it grew. Anyone
          quoting a level without naming a base year has left out half the number.
        </p>
        <p>
          That assumption does real work, and outside this model it fails. An economy makes many
          goods whose prices move relative to one another, and a real series built on 1987 prices
          grows at a different rate than the same data built on 1996 prices, because the weights
          differ. The effect was large enough in the American computer industry that the statistical
          agency abandoned fixed-weight real output in 1996 for a chained measure. The choice of
          base year changes the story, which is why the story now names its base year.
        </p>

        <div className="breakit">
          <span className="eyebrow">Break it</span>
                    <p>
            Raise government purchases by fifty without funding them. Spending rises, income does
            not, and the panel names the identity the figures now violate. There is no single
            correct repair: taxes, wages, operating surplus or net exports could each absorb it, and
            the accounts cannot say which one did.
          </p>
          <button type="button" onClick={() => set('G', 250)}>
            raise G by 50
          </button>
          <button type="button" onClick={reset}>
            reset
          </button>
          <ShareLink chapterId="ch1-measurement" modelId={circularFlowModel.id} overrides={overrides} />
        </div>

        <CaseFile
          part={2}
          title="The accounts do not close"
          anchor="case"
          question="Verano's statistical office published these figures. One of them is wrong. Which, and by how much?"
        >
          <p>
            The published release gives the expenditure side and the income side of Veranese output
            for last year. An opposition economist has pointed out that the two do not agree, and
            the Ministry has replied that the difference is a rounding artefact.
          </p>

          <CaseFigures
            model={circularFlowModel}
            overrides={VERANO_PUBLISHED}
            show={[
              { varId: 'Y', label: 'Output, by spending' },
              { varId: 'Yincome', label: 'Output, by income' },
              { varId: 'C', label: 'Consumption' },
              { varId: 'I', label: 'Investment' },
              { varId: 'G', label: 'Government' },
              { varId: 'NX', label: 'Net exports' },
              { varId: 'W', label: 'Wages' },
              { varId: 'Pi', label: 'Profits' },
            ]}
          />

          <p>
            It is not rounding. The two sides differ by{' '}
            <Delta
              model={circularFlowModel}
              from={VERANO_PUBLISHED}
              to={VERANO_ACCOUNTS}
              of="Yincome"
              as="difference"
            />
                        . National accounts do carry a line for exactly this: the statistical discrepancy
            between output measured by spending and by income, which in most countries runs at one
            or two percent of output. Verano&rsquo;s gap is{' '}
            <Delta
              model={circularFlowModel}
              from={VERANO_PUBLISHED}
              to={{ ...VERANO_PUBLISHED, W: VERANO_ACCOUNTS.W! }}
              of="Yincome"
            />{' '}
            of income, several times that. Somebody earned income nobody recorded.
          </p>

          <button type="button" className="share" onClick={() => {
            for (const [id, value] of Object.entries(VERANO_PUBLISHED)) set(id, value);
          }}>
            load Verano&rsquo;s published figures
          </button>

          <p>
                        With those loaded, the panel names the identity the figures violate and lists the
            changes that would each make them consistent. One of them is the truth. The others are
            arithmetic.
          </p>

          <CaseAnswer>
            <p>
              Wages were understated by{' '}
              <Delta
                model={circularFlowModel}
                from={VERANO_PUBLISHED}
                to={VERANO_ACCOUNTS}
                of="W"
                as="difference"
              />
              . With that correction both sides read the same number, and every identity holds:
            </p>
            <CaseFigures
              model={circularFlowModel}
              overrides={VERANO_ACCOUNTS}
              show={[
                { varId: 'Y', label: 'Output, by spending' },
                { varId: 'Yincome', label: 'Output, by income' },
                { varId: 'W', label: 'Wages, corrected' },
              ]}
            />
            <p>
              The correction matters beyond tidiness. A minister has been arguing that Verano&rsquo;s
              trade deficit is the result of unfair competition abroad. The identity gives the
              deficit as national saving less investment, and Verano&rsquo;s figures are these:
            </p>
            <CaseFigures
              model={circularFlowModel}
              overrides={VERANO_ACCOUNTS}
              show={[
                { varId: 'Sprivate', label: 'Private saving' },
                { varId: 'Spublic', label: 'Public saving' },
                { varId: 'I', label: 'Investment' },
                { varId: 'netLending', label: 'Saving less investment' },
                { varId: 'NX', label: 'Trade balance' },
              ]}
            />
            <p>
              Verano invested more than it saved and borrowed the difference abroad. That is what
              the deficit is. Whether foreign competition is unfair is a separate question, and no
              answer to it changes these numbers by a single unit.
            </p>
          </CaseAnswer>
        </CaseFile>
      </main>

      <ErrorBoundary label="The model stage">
        <ModelStage
          model={circularFlowModel}
          overrides={overrides}
          onChange={set}
          controls={['C', 'I', 'G', 'NX', 'T']}
          show={['Y', 'Yincome', 'Sprivate', 'Spublic', 'netLending', 'privateBalance', 'publicBalance', 'foreignBalance']}
          period={0}
          periods={0}
        />
      </ErrorBoundary>
    </>
  );
}
