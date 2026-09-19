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
  const currentG = overrides.G ?? circularFlowModel.defaults.G!;

  return (
    <>
      <main className="prose">
        <span className="eyebrow">Chapter 1</span>
        <h1>Measuring the macroeconomy</h1>
        <p className="lede">
          Before any theory arrives, a good deal about an economy is already settled. Some
          statements follow from nothing more than how the quantities are defined, and every
          explanation anyone offers, for a recession or a trade war or a housing boom, has to fit
          inside them. This chapter is about those statements. It is the least controversial chapter
          in the book, which in economics is saying something.
        </p>

        <h2 id="circular-flow">The circular flow</h2>
        <p>
          Gross domestic product, or GDP, is the market value of everything an economy produces in
          a year. You can count it three ways: add up what everyone bought, add up what everyone
          earned, or add up what every producer made. All three give the same total, because they
          measure one flow at different points on a circle. Buy a coffee and your spending becomes
          the café&rsquo;s revenue, which becomes the barista&rsquo;s wage, the owner&rsquo;s
          surplus and the tax on the sale. Nothing falls out of the sum along the way.
        </p>
        <p>
          The third method adds up the value each producer adds, rather than everything it sells,
          and it answers an objection that is probably already forming. A steel mill sells steel to
          a carmaker, and the car is counted in GDP. Has the steel been counted twice? No. Only the
          value added at each stage enters the total: the car&rsquo;s price less what the carmaker
          paid for steel, plus the steel&rsquo;s price less what the mill paid for ore, and so on
          back up the chain. That convention is what makes the identities in this chapter exactly
          true rather than roughly true.
        </p>
        <p>
          The panel below shows the other two methods. The spending side splits output into
          consumption, investment, government purchases and net exports. The income side splits the
          same total into wages, the operating surplus that goes to the owners of businesses, and
          taxes on production such as sales tax. Income tax is missing from that list on purpose: it
          is paid out of wages and surplus that are already counted, and adding it again would count
          the same income twice. The panel currently reports{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Y" /> by spending and{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Yincome" /> by income.
        </p>

        <ErrorBoundary label="The circular flow">
          <ReconcilePanel model={circularFlowModel} overrides={overrides} onChange={set} />
        </ErrorBoundary>

        <p>
          Now raise government purchases without touching anything else. Spending rises and income
          does not, so the two measures of output disagree. The panel names the identity that has
          broken and lists each single change that would restore it: higher wages, a larger
          surplus, more tax on production, or less spending somewhere else. Somebody had to earn the
          money the government spent. The accounts insist on that, and are entirely indifferent to
          who it was.
        </p>
        <p>
          That is the lesson of the chapter in one move. You cannot change a single flow on its
          own, because every flow is an outgoing for one party and an incoming for another. The
          arrows have two ends. A surprising amount of economic commentary is written from one end
          of the arrow.
        </p>

        <h2 id="balances">Sector balances</h2>
        <p>
          Private saving is what the private sector has left of its income after tax and
          consumption. Public saving is what the government collects in taxes less what it buys,
          and it turns negative whenever the government runs a deficit. Add the two, subtract
          investment, and what remains is the country&rsquo;s net lending to the rest of the world.
          It equals the trade balance:
        </p>
        <p className="callout">
          <span className="mono">S_p + S_g − I = NX</span>
        </p>
        <p>
          With the figures in the panel, private saving is{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Sprivate" />, public saving is{' '}
          <Result model={circularFlowModel} overrides={overrides} of="Spublic" />, and investment is{' '}
          <Result model={circularFlowModel} overrides={overrides} of="I" />. Net lending is
          therefore{' '}
          <Result model={circularFlowModel} overrides={overrides} of="netLending" />, and the trade
          balance is the same number. Move any slider and the two stay locked together.
        </p>
        <p>
          This makes a trade deficit something quite concrete. A country running one has invested
          more than it saved and borrowed the difference from abroad. That can be perfectly
          sensible: a young company borrowing to build a factory runs exactly this kind of deficit,
          and nobody calls it a crisis. Whether it is a problem depends on what the investment
          bought and whether the borrowing can be repaid, and the identity says nothing about
          either. What it does settle is that any story about a trade deficit must also be a story
          about saving and investment. (Strictly, the left side equals the current account, which
          also counts income earned on assets abroad. For a country that owes nothing and owns
          nothing abroad, as here, the two are the same.)
        </p>
        <p>
          Rearrange the identity into three balances, one each for the private sector, the
          government and the rest of the world, and they sum to exactly zero. One sector can run a
          surplus only if another runs a deficit. A government that promises to shrink its own
          deficit while households save more and the trade balance stays put is promising
          arithmetic that does not exist. Governments of every stripe have made that promise
          anyway.
        </p>

        <h2 id="real-nominal">Real and nominal</h2>
        <p>
          Output measured at this year&rsquo;s prices is <em>nominal</em>. It rises when an economy
          makes more, and it also rises when the same things cost more, which is a much less
          cheerful kind of growth. Divide nominal output by a price index and what remains is{' '}
          <em>real</em> output, which tracks quantities rather than prices. The index is set to 100
          in a chosen base year, and the choice of year is arbitrary.
        </p>
        <p>
          The index used here, the GDP deflator, prices everything the economy produces. The
          consumer price index quoted on the news prices a typical household&rsquo;s shopping
          instead, imports included, so the two can drift apart. Neither is wrong. They answer
          different questions.
        </p>
        <p>
          The base year changes levels. With a single fixed set of base-year prices, as assumed
          here, it leaves growth rates alone. Two accounts of the same history based on different
          years will disagree about how large the economy was and agree exactly about how fast it
          grew. Anyone quoting a real level without naming the base year has left out half the
          number.
        </p>
        <p>
          Outside this model that assumption fails. A real economy makes many goods whose prices
          move relative to one another, so a real series built on one year&rsquo;s prices grows at
          a different rate from the same data built on another&rsquo;s. In the United States the
          problem came to a head with computers, whose prices fell so fast that the choice of base
          year visibly changed the measured growth of the whole economy. In 1996 the statistical
          agency gave up on fixed weights and moved to a chained index, which updates the weights
          every year. The computer industry broke the national accounts by being too good at its
          job.
        </p>

        <div className="breakit">
          <span className="eyebrow">Break it</span>
          <p>
            Raise government purchases by 50 and fund them from nowhere. Spending rises, income
            does not, and the panel names the identity that has broken. There is no single correct
            repair. Wages, surplus, taxes on production or spending elsewhere could each absorb it,
            and the accounts cannot say which one did. Deciding that takes a claim about behaviour,
            which is where the next chapter begins.
          </p>
          <button type="button" onClick={() => set('G', currentG + 50)}>
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
            Verano&rsquo;s statistical office has published last year&rsquo;s accounts, spending
            side and income side. An opposition economist has pointed out that the two do not
            agree. The Ministry has replied that the difference is a rounding artefact, which is
            the traditional first response to an inconvenient number.
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
              { varId: 'Pi', label: 'Operating surplus' },
              { varId: 'Tprod', label: 'Taxes on production' },
            ]}
          />

          <p>
            The two sides differ by{' '}
            <Delta
              model={circularFlowModel}
              from={VERANO_PUBLISHED}
              to={VERANO_ACCOUNTS}
              of="Yincome"
              as="difference"
            />
            , which is too much to blame on rounding. National accounts do carry a line for gaps
            like this, the statistical discrepancy, because spending and income are measured from
            different sources that never agree perfectly. In most countries it stays within a
            percent or two of output. Verano&rsquo;s gap is{' '}
            <Delta
              model={circularFlowModel}
              from={VERANO_PUBLISHED}
              to={{ ...VERANO_PUBLISHED, W: VERANO_ACCOUNTS.W! }}
              of="Yincome"
            />{' '}
            of income, well outside that range. Somewhere in Verano, somebody earned income that
            nobody wrote down.
          </p>

          <button type="button" className="share" onClick={() => {
            for (const [id, value] of Object.entries(VERANO_PUBLISHED)) set(id, value);
          }}>
            load Verano&rsquo;s published figures
          </button>

          <p>
            Load the published figures into the panel at the top of the chapter. It names the
            identity they violate and lists each single change that would make them consistent.
            One of those changes is the truth. The others are only arithmetic, and telling them
            apart takes evidence the identity cannot supply.
          </p>
          <p>
            Here is the evidence. Verano&rsquo;s spending figures reconcile with its customs and
            sales-tax records, so the error is on the income side. Of the income lines, wages are
            the one compiled from a payroll survey, and Verano&rsquo;s survey still uses a sample
            drawn before two years of rapid hiring.
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
              The correction matters for more than tidiness. A minister has been arguing that
              Verano&rsquo;s trade deficit is the result of unfair competition abroad. The identity
              says the deficit is national saving less investment, and Verano&rsquo;s figures are
              these:
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
              Verano invested more than it saved and borrowed the difference abroad, and that is
              the whole of the deficit. Foreign competition may or may not be unfair, but no answer
              to that question changes these numbers by a single veral. A minister who wants a
              smaller deficit has two levers, more saving or less investment, and the only line in
              the table the minister controls directly is public saving.
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
