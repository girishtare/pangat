import Link from "next/link";
import { Mukta, Rozha_One } from "next/font/google";
import { isDemo } from "@/lib/store";
import { DEMO_TOKENS } from "@/lib/store/demo";
import { Mark } from "./ui/kit";

// Landing page only: the host and guest screens keep Noto for now.
const rozha = Rozha_One({ weight: "400", subsets: ["latin"], display: "swap" });
const mukta = Mukta({ weight: ["400", "600", "700"], subsets: ["latin"], display: "swap" });

// Rozha has one weight; font-normal stops the browser faking bold. Use it at 20 px and above only.
const display = `${rozha.className} font-normal`;
const wrap = "mx-auto max-w-[1200px] px-4 md:px-6";

const btn = "inline-flex items-center justify-center rounded-xl border-2 font-bold no-underline transition-colors";
const btnFilled = `${btn} border-maroon bg-maroon text-white hover:border-maroon-dark hover:bg-maroon-dark`;
const btnOutline = `${btn} border-maroon bg-card-e text-maroon hover:bg-sand/50`;
const btnLarge = "min-h-14 rounded-[14px] px-7 text-lg";

/** The phone and web designs word some lines differently; show each where it was designed. */
function Copy({ wide, narrow }: { wide: string; narrow: string }) {
  return (
    <>
      <span className="hidden md:inline">{wide}</span>
      <span className="md:hidden">{narrow}</span>
    </>
  );
}

function Tick({ tone }: { tone: "maroon" | "sky" }) {
  return (
    <span aria-hidden="true" className={`font-bold ${tone === "maroon" ? "text-maroon" : "text-sky-ink"}`}>
      ✓
    </span>
  );
}

export default function Home() {
  const demo = isDemo();
  return (
    <div className={`${mukta.className} min-h-screen bg-cream text-[17px] leading-[1.6] text-ink-e`}>
      <Header demo={demo} />
      <main>
        <Hero demo={demo} />
        <Problem />
        <HowItWorks />
        <ForFamilies />
        {!demo && <FinalCall />}
      </main>
      <Footer />
    </div>
  );
}

function Header({ demo }: { demo: boolean }) {
  return (
    <header className="border-b border-sand bg-cream md:sticky md:top-0 md:z-10 md:bg-cream/95">
      <nav aria-label="Main" className={`${wrap} flex items-center justify-between gap-2 py-3 md:gap-4 md:py-3.5`}>
        <a href="#top" className="flex items-center gap-2 text-maroon no-underline md:gap-2.5">
          <Mark className="h-[26px] w-[26px] md:h-8 md:w-8" />
          <span className={`${display} text-2xl leading-none md:text-[30px]`}>Pangat</span>
        </a>
        <div className="flex items-center gap-7">
          <a href="#how" className="hidden font-semibold text-ink-e no-underline hover:text-maroon md:inline">
            How it works
          </a>
          <a href="#families" className="hidden font-semibold text-ink-e no-underline hover:text-maroon md:inline">
            For families
          </a>
          {!demo && (
            <div className="flex gap-2 md:gap-2.5">
              <Link href="/host/login" className={`${btnOutline} min-h-11 px-3.5 text-base md:min-h-[46px] md:px-5 md:text-[17px]`}>
                Log in
              </Link>
              <Link href="/host/signup" className={`${btnFilled} min-h-11 px-3.5 text-base md:min-h-[46px] md:px-[22px] md:text-[17px]`}>
                <Copy wide="Sign up free" narrow="Sign up" />
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function Hero({ demo }: { demo: boolean }) {
  return (
    <section
      id="top"
      className={`${wrap} grid items-center gap-0 pt-9 md:gap-14 md:pb-16 md:pt-[72px] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]`}
    >
      <div className="min-w-0 pb-8 md:pb-0">
        <p className="mb-3 inline-flex items-center rounded-full bg-sand px-3 py-1 text-sm font-bold text-maroon-dark md:mb-3.5 md:px-3.5 md:py-1.5 md:text-[15px]">
          For Indian weddings and family functions
        </p>
        <h1 className={`${display} text-[42px] leading-[1.1] text-maroon md:text-[62px] md:leading-[1.08]`}>Know who is really coming.</h1>
        <p className="mt-4 max-w-[540px] text-lg text-ink-e-soft md:mt-5 md:text-[19px]">
          <Copy
            wide="Every invited family gets its own reply link — on WhatsApp, and as a QR slip inside their printed card. They tell you who is coming to each function, in Marathi or English, in under a minute. You give the caterer a number you can stand behind."
            narrow="Every invited family gets its own reply link — on WhatsApp, and as a QR slip in their printed card. They reply in under a minute, in Marathi or English. You give the caterer a number you can stand behind."
          />
        </p>
        {demo ? (
          <DemoBox />
        ) : (
          <>
            <div className="mt-6 grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3 md:mt-[30px]">
              <Link href="/host/signup" className={`${btnFilled} ${btnLarge}`}>
                Create a free account
              </Link>
              <Link href="/host/login" className={`${btnOutline} ${btnLarge}`}>
                Log in
              </Link>
            </div>
            <p className="mt-3 text-center text-[15px] text-ink-e-soft sm:text-left md:mt-4">
              Free · Nothing to install · Guests never sign up
            </p>
          </>
        )}
      </div>
      <PhoneMockup />
      <CardMockup />
    </section>
  );
}

function DemoBox() {
  return (
    <section aria-labelledby="demo-title" className="mt-6 rounded-[20px] border border-sand bg-card-e p-5 md:mt-[30px] md:p-6">
      <h2 id="demo-title" className="text-lg font-bold text-maroon">
        Demo mode
      </h2>
      <p className="mt-1 text-base text-ink-e-soft">No database is configured, so a sample wedding is loaded in memory.</p>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {DEMO_TOKENS.map((token) => (
          <li key={token}>
            <Link href={`/r/${token}`} className="inline-flex min-h-11 items-center font-semibold text-maroon underline underline-offset-4 hover:text-maroon-dark">
              Guest page: {token}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/host" className={`${btnFilled} mt-3 min-h-12 px-5`}>
        Host dashboard
      </Link>
    </section>
  );
}

/* Hero illustrations. Decorative only, so hidden from screen readers. */

const cardFrame =
  "rounded-xl bg-sand text-center shadow-[inset_0_0_0_5px_#e5d3af,inset_0_0_0_6px_#790d16,inset_0_0_0_9px_#e5d3af,inset_0_0_0_10px_#790d16]";

function InviteCard() {
  return (
    <div className={`${cardFrame} px-3 pb-6 pt-5`}>
      <div className="text-xs font-bold text-maroon">You are warmly invited</div>
      <div className={`${display} text-[28px] leading-[1.3] text-maroon`}>Priya &amp; Rohan</div>
      <div className="text-xs text-ink-e-soft">Sunday, 28 December · Pune</div>
    </div>
  );
}

function ExpectedBar() {
  return (
    <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-track">
      <span className="w-[52%] bg-maroon" />
      <span className="w-[19%] bg-sky" />
    </div>
  );
}

/** Web: the guest screen inside a phone frame, with the expected-count card floating at its corner. */
function PhoneMockup() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[484px] justify-center pb-10 pt-2.5 md:flex">
      <div className="w-[290px] overflow-hidden rounded-[40px] border-[10px] border-ink-e bg-cream shadow-[0_40px_70px_-40px_rgba(46,26,28,0.55)]">
        <div className="flex flex-col gap-3 px-3.5 pb-5 pt-4">
          <div className="flex justify-end">
            <span className="rounded-full bg-maroon px-2.5 py-0.5 text-xs font-bold text-white">English</span>
          </div>
          <InviteCard />
          <div className="rounded-[14px] border border-sand bg-card-e p-3 text-center">
            <div className="text-xs text-ink-e-soft">This invitation is for</div>
            <div className="text-[17px] font-bold">Shri. Anil Joshi &amp; family</div>
          </div>
          <div className="text-center text-[15px] font-bold">Is this invitation for you?</div>
          <div className="flex min-h-[46px] items-center justify-center rounded-xl bg-maroon font-bold text-white">Yes, that&apos;s us</div>
          <div className="flex min-h-[46px] items-center justify-center rounded-xl border-2 border-maroon font-bold text-maroon">
            No, this isn&apos;t us
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-[230px] rounded-2xl border border-sand bg-card-e px-[18px] py-4 shadow-[0_24px_50px_-24px_rgba(121,13,22,0.35)]">
        <div className="text-[13px] font-bold text-ink-e-soft">Wedding · expected</div>
        <div className={`${display} text-[44px] leading-[1.1] text-maroon`}>684</div>
        <ExpectedBar />
        <div className="mt-1.5 flex gap-3 text-xs text-ink-e-soft">
          <span>
            <span className="text-maroon">■</span> Veg
          </span>
          <span className="text-sky-ink">■ Non-veg</span>
          <span>71% replied</span>
        </div>
      </div>
    </div>
  );
}

/** Phone: a flat card version, with the expected-count card overlapping its bottom edge. */
function CardMockup() {
  return (
    <div aria-hidden="true" className="relative pb-10 md:hidden">
      <div className="rounded-[22px] border border-sand bg-card-e p-3.5 shadow-[0_30px_50px_-34px_rgba(46,26,28,0.5)]">
        <InviteCard />
        <div className="mb-2.5 mt-3 text-center text-[15px] font-bold">Is this invitation for you?</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex min-h-11 items-center justify-center rounded-xl bg-maroon text-[15px] font-bold text-white">Yes, that&apos;s us</div>
          <div className="flex min-h-11 items-center justify-center rounded-xl border-2 border-maroon text-[15px] font-bold text-maroon">
            No, not us
          </div>
        </div>
      </div>
      <div className="relative ml-auto -mt-[18px] w-[210px] rounded-2xl border border-sand bg-card-e px-4 py-3.5 shadow-[0_24px_50px_-24px_rgba(121,13,22,0.35)]">
        <div className="text-[13px] font-bold text-ink-e-soft">Wedding · expected</div>
        <div className={`${display} text-[40px] leading-[1.1] text-maroon`}>684</div>
        <ExpectedBar />
        <div className="mt-1.5 text-xs text-ink-e-soft">Veg · Non-veg · 71% replied</div>
      </div>
    </div>
  );
}

function Problem() {
  return (
    <section className="bg-maroon text-card-e">
      <div className={`${wrap} grid gap-3.5 py-10 md:grid-cols-2 md:items-center md:gap-8 md:py-14`}>
        <h2 className={`${display} text-[28px] leading-[1.25] md:text-[38px] md:leading-[1.2]`}>
          400 cards go out. 700 to 800 people are expected. Nobody knows the real number until the day.
        </h2>
        <p className="text-[17px] text-[#f2e4d8] md:text-[19px]">
          <Copy
            wide="The caterer needs one number weeks before the wedding. Order too much and food and money go to waste; order too little and the hosts are embarrassed. Pangat replaces weeks of phone calls with a reply from every family."
            narrow="The caterer needs one number weeks before. Pangat replaces weeks of phone calls with a reply from every family."
          />
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Send each family its own link",
    wide: "Load your guest list from Excel. Pangat opens WhatsApp with the message already written, and prints a QR slip for every card.",
    narrow: "Load your list from Excel. WhatsApp opens with the message written; a QR slip prints for every card.",
    icon: (
      <>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7z" />
      </>
    ),
  },
  {
    title: "They reply in a minute",
    wide: "Haldi, wedding, reception: who is coming to each, how many, and how many eat vegetarian. No sign-up, big buttons, Marathi first.",
    narrow: "Who is coming to each function, how many, how many vegetarian. No sign-up, Marathi first.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
  },
  {
    title: "You see the real number",
    wide: "Live headcount per function, split veg and non-veg, plus an expected count that allows for families who haven't replied yet.",
    narrow: "Live headcount per function, veg and non-veg, plus an expected count for families yet to reply.",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15v3" />
        <path d="M12 10v8" />
        <path d="M17 6v12" />
      </>
    ),
  },
];

function HowItWorks() {
  return (
    <section id="how" className={`${wrap} scroll-mt-24 pb-6 pt-12 md:pb-10 md:pt-[88px]`}>
      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink-e-soft md:text-sm">How it works</p>
      <h2 className={`${display} mb-5 mt-1 text-[30px] leading-[1.2] text-maroon md:mb-9 md:mt-1.5 md:text-[42px]`}>
        Three steps. One honest number.
      </h2>
      <ol className="grid gap-3.5 md:gap-6 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3.5 rounded-[18px] border border-sand bg-card-e p-5 md:block md:rounded-[20px] md:p-7">
            <div className="flex shrink-0 items-center gap-3">
              <span
                aria-hidden="true"
                className={`${display} flex h-10 w-10 items-center justify-center rounded-full bg-maroon text-xl text-white md:h-11 md:w-11 md:text-[22px]`}
              >
                {i + 1}
              </span>
              <svg
                viewBox="0 0 24 24"
                className="hidden h-7 w-7 md:block"
                fill="none"
                stroke="#4f6b80"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {step.icon}
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="mb-1 text-[19px] font-bold leading-[1.3] md:mb-1.5 md:mt-[18px] md:text-[22px]">{step.title}</h3>
              <p className="text-base text-ink-e-soft md:text-[17px]">
                <Copy wide={step.wide} narrow={step.narrow} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ForFamilies() {
  const item = "flex gap-2.5";
  return (
    <section id="families" className={`${wrap} grid scroll-mt-24 gap-3.5 pb-12 pt-6 md:grid-cols-2 md:gap-6 md:pb-[88px] md:pt-14`}>
      <div className="rounded-[20px] bg-sand p-6 md:rounded-3xl md:p-9">
        <h2 className={`${display} mb-2.5 text-[26px] leading-[1.25] text-maroon md:mb-3 md:text-[32px]`}>Made for the eldest guest</h2>
        <ul className="grid gap-2.5 text-base md:gap-3 md:text-[17px]">
          <li className={item}>
            <Tick tone="maroon" />
            <span>
              <Copy wide="Large text and big buttons, one clear question at a time" narrow="Large text, big buttons, one question at a time" />
            </span>
          </li>
          <li className={item}>
            <Tick tone="maroon" />
            <span>Marathi by default for guests, English one tap away</span>
          </li>
          <li className={item}>
            <Tick tone="maroon" />
            <span>
              <Copy wide="No smartphone? They call you and give their six-letter code" narrow="No smartphone? They call and give their code" />
            </span>
          </li>
          <li className={item}>
            <Tick tone="maroon" />
            <span>
              <Copy wide="Works inside WhatsApp, on any phone, on patchy data" narrow="Works inside WhatsApp, on any phone" />
            </span>
          </li>
        </ul>
      </div>
      <div className="rounded-[20px] border border-sand bg-card-e p-6 md:rounded-3xl md:p-9">
        <h2 className={`${display} mb-2.5 text-[26px] leading-[1.25] text-maroon md:mb-3 md:text-[32px]`}>Both sides, working together</h2>
        <ul className="grid gap-2.5 text-base md:gap-3 md:text-[17px]">
          <li className={item}>
            <Tick tone="sky" />
            <span>
              <Copy
                wide="Invite up to three helpers each for the bride's and groom's side"
                narrow="Up to three helpers each for the bride's and groom's side"
              />
            </span>
          </li>
          <li className={item}>
            <Tick tone="sky" />
            <span>Each side sees only its own guests</span>
          </li>
          <li className={`${item} max-md:hidden`}>
            <Tick tone="sky" />
            <span>Record replies taken over the phone in seconds</span>
          </li>
          <li className={item}>
            <Tick tone="sky" />
            <span>
              <Copy wide="Freeze the number on the day the caterer needs it" narrow="Freeze the number the day the caterer needs it" />
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

function FinalCall() {
  return (
    <section className="bg-sky">
      <div className={`${wrap} flex flex-col gap-5 py-11 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-7 md:py-[72px]`}>
        <div className="min-w-0">
          <h2 className={`${display} text-[30px] leading-[1.2] text-ink-e md:text-[42px]`}>Start with your guest list.</h2>
          <p className="mt-1.5 text-[17px] text-ink-e md:mt-2 md:text-[19px]">Set up your event in five minutes. It&apos;s free.</p>
        </div>
        <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
          <Link href="/host/signup" className={`${btnFilled} ${btnLarge}`}>
            Create a free account
          </Link>
          <Link href="/host/login" className={`${btn} ${btnLarge} border-ink-e bg-cream text-ink-e hover:bg-card-e`}>
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={`${wrap} pb-10 pt-7 text-[15px] text-ink-e-soft md:pb-12 md:pt-9`}>
      <p className="max-w-[560px]">
        <strong className={`${display} text-xl text-maroon`}>Pangat</strong> — the traditional row of guests seated together for a wedding meal.
      </p>
    </footer>
  );
}
