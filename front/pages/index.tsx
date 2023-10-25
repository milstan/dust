import {
  AnthropicLogo,
  Button,
  DriveLogo,
  GithubLogo,
  GoogleLogo,
  HuggingFaceLogo,
  Logo,
  LogoHorizontalWhiteLogo,
  MicrosoftLogo,
  MistralLogo,
  MoreIcon,
  NotionLogo,
  OpenaiLogo,
  PriceTable,
  SlackLogo,
} from "@dust-tt/sparkle";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Script from "next/script";
import { signIn } from "next-auth/react";
import { ParsedUrlQuery } from "querystring";
import React, { useEffect, useRef, useState } from "react";

import {
  Grid,
  H1,
  H2,
  H3,
  H4,
  P,
  ReactiveIcon,
  ReactiveImg,
  Separator,
  Strong,
} from "@app/components/home/contentComponents";

const defaultFlexClasses = "flex flex-col gap-4";

import { GoogleSignInButton } from "@app/components/Button";
import Particles from "@app/components/home/particles";
import ScrollingHeader from "@app/components/home/scrollingHeader";
import { getSession, getUserFromSession } from "@app/lib/auth";
import { classNames } from "@app/lib/utils";

const { GA_TRACKING_ID = "" } = process.env;

export const getServerSideProps: GetServerSideProps<{
  gaTrackingId: string;
}> = async (context) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserFromSession(session);

  if (user && user.workspaces.length > 0) {
    let url = `/w/${user.workspaces[0].sId}`;

    if (context.query.wId) {
      url = `/api/login?wId=${context.query.wId}`;
    }
    if (context.query.inviteToken) {
      url = `/api/login?inviteToken=${context.query.inviteToken}`;
    }

    return {
      redirect: {
        destination: url,
        permanent: false,
      },
    };
  }

  return {
    props: { gaTrackingId: GA_TRACKING_ID },
  };
};

export default function Home({
  gaTrackingId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [logoY, setLogoY] = useState<number>(0);
  const logoRef = useRef<HTMLDivElement | null>(null);

  const scrollRef1 = useRef<HTMLDivElement | null>(null);
  const scrollRef2 = useRef<HTMLDivElement | null>(null);
  const scrollRef3 = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logoRef.current) {
      const logoPosition = logoRef.current.offsetTop;
      setLogoY(logoPosition);
    }
  }, []);

  function getCallbackUrl(routerQuery: ParsedUrlQuery): string {
    let callbackUrl = "/api/login";
    if (routerQuery.wId) {
      callbackUrl += `?wId=${routerQuery.wId}`;
    } else if (routerQuery.inviteToken) {
      callbackUrl += `?inviteToken=${routerQuery.inviteToken}`;
    }
    return callbackUrl;
  }

  return (
    <>
      <Header />
      <ScrollingHeader showItemY={logoY}>
        <div className="flex h-full w-full items-center px-4">
          <Logo className="logo invisibleFirst hidden h-[24px] w-[96px] opacity-0 transition-all duration-500 ease-out md:block" />
          <div className="flex-grow" />
          <div className="flex items-center gap-2">
            {!(router.query.signIn && router.query.signIn !== "github") && (
              <div className="font-regular font-objektiv text-xs text-slate-400">
                Sign in with{" "}
                <span
                  className="cursor-pointer font-bold hover:text-blue-400"
                  onClick={() => {
                    void signIn("github", {
                      callbackUrl: getCallbackUrl(router.query),
                    });
                  }}
                >
                  GitHub
                </span>{" "}
                or
              </div>
            )}
            <GoogleSignInButton
              onClick={() =>
                signIn("google", {
                  callbackUrl: getCallbackUrl(router.query),
                })
              }
            >
              <img src="/static/google_white_32x32.png" className="h-4 w-4" />
              <span className="ml-2 mr-1">Sign in with Google</span>
            </GoogleSignInButton>
          </div>
        </div>
      </ScrollingHeader>

      {/* Keeping the background dark */}
      <div className="fixed bottom-0 left-0 right-0 top-0 -z-50 bg-slate-900" />
      {/* Particle system */}
      <div className="fixed bottom-0 left-0 right-0 top-0 -z-40 overflow-hidden">
        <Particles
          scrollRef1={scrollRef1}
          scrollRef2={scrollRef2}
          scrollRef3={scrollRef3}
        />
      </div>

      <main className="z-10 flex flex-col items-center">
        <div className="container flex max-w-7xl flex-col gap-16">
          <Grid>
            <div className="col-span-8 col-start-3 flex flex-col gap-16">
              <div style={{ height: "24vh" }} />
              <div ref={logoRef}>
                <Logo className="h-[48px] w-[192px]" />
              </div>
              <H1>
                <span className="text-red-400 sm:font-objektiv md:font-objektiv">
                  Amplify your team's potential
                </span>{" "}
                <br />
                with customizable and secure AI&nbsp;assistants
              </H1>
              <H3 className="col-span-6 col-start-3">
                AI is changing the way we work.
                <br />
                Effectively channeling the potential of AI is a competitive
                edge.
              </H3>
            </div>
          </Grid>
          <Grid className="items-center">
            <div className="col-span-6 col-start-2">
              <ReactiveImg containerPaddingCSS="p-6">
                <img src="/static/landing/conversation.png" />
              </ReactiveImg>
            </div>
            <div className={classNames(defaultFlexClasses, "col-span-3 gap-8")}>
              <P>
                Empower teams with{" "}
                <Strong>assistants tailored to&nbsp;their needs</Strong>, using{" "}
                <Strong>the best models</Strong> augmented with{" "}
                <Strong>your company's knowledge</Strong>.
              </P>
              <Separator color="amber" />
              <P>
                Deploy <Strong>Large Language Models</Strong> on{" "}
                <Strong>concrete use cases</Strong> in your company{" "}
                <Strong>today</Strong>.
              </P>
              <Separator color="red" />
              <P>
                <Strong>Control granularly data access</Strong> with a{" "}
                <Strong>safe and privacy-obsessed</Strong> application.
              </P>
              <Separator color="emerald" />
            </div>
          </Grid>

          <Grid>
            <div
              ref={scrollRef1}
              className={classNames(
                defaultFlexClasses,
                "col-span-8 col-start-3 flex flex-col gap-4"
              )}
            >
              <H2 color="text-sky-500">
                Get the state of the&nbsp;art,
                <br />
                <H2 isSpan color="text-sky-200">
                  today and&nbsp;tomorrow.
                </H2>
              </H2>
              <P variant="big">
                Dust gives you&nbsp;access to the&nbsp;
                <Strong>leading models</Strong>, and&nbsp; augments them
                with&nbsp;
                <Strong>your&nbsp;company’s internal&nbsp;information</Strong>.
              </P>
            </div>
          </Grid>
          <Grid>
            <div className={classNames(defaultFlexClasses, "col-span-6")}>
              <P className="pr-48">
                Proprietary and&nbsp;open-source models suited
                to&nbsp;your&nbsp;needs:{" "}
                <Strong>OpenAI, Anthropic, Mistral…</Strong>
              </P>
              <div className="flex flex-wrap gap-0">
                <ReactiveIcon colorHEX="#1E3A8A">
                  <GoogleLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#1E3A8A">
                  <DriveLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#FFFFFF">
                  <NotionLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#FFFFFF">
                  <GithubLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#3A123E">
                  <SlackLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#A26BF7">
                  <OpenaiLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#D4A480">
                  <AnthropicLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#1E3A8A">
                  <MistralLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#1E3A8A">
                  <HuggingFaceLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#1E3A8A">
                  <MicrosoftLogo />
                </ReactiveIcon>
                <ReactiveIcon colorHEX="#FFFFFF">
                  <MoreIcon className="text-slate-900" />
                </ReactiveIcon>
              </div>
              <P className="pr-48">
                <Strong>Modular and composable</Strong>, Dust is&nbsp;deeply
                customizable to&nbsp;your exact needs and will evolve as
                those&nbsp;needs evolve.
              </P>
            </div>
            <div className="test-right col-span-6 flex flex-col items-end gap-6">
              <div className="w-8/12">
                <ReactiveImg containerPaddingCSS="p-0">
                  <img src="/static/landing/connect.png" />
                </ReactiveImg>
              </div>
              <P className="w-8/12">
                Your own knowledge base continuously in&nbsp;sync:{" "}
                <Strong>
                  Notion, Slack, GitHub, Google Drive, and&nbsp;more
                </Strong>
                .
              </P>
            </div>
          </Grid>
          <Grid>
            <div
              ref={scrollRef2}
              className={classNames(
                defaultFlexClasses,
                "col-span-8 col-start-3 flex flex-col gap-4"
              )}
            >
              <H2 color="text-amber-500">
                Bring your&nbsp;team
                <br />
                <H2 isSpan color="text-amber-200">
                  up&nbsp;to&nbsp;speed.
                </H2>
              </H2>
              <P variant="big">
                Embracing AI is a&nbsp;paradigm shift for&nbsp;your
                team’s&nbsp;workflows.
                <br />
                Dust empowers{" "}
                <Strong>your most creative and driven team members</Strong>{" "}
                to&nbsp;<Strong>develop and&nbsp;share</Strong> their practices
                throughout your&nbsp;company.
              </P>
            </div>
          </Grid>
          <Grid>
            <div className="col-span-5">
              <ReactiveImg containerPaddingCSS="p-6">
                <img src="/static/landing/builder.png" />
              </ReactiveImg>
            </div>
            <div
              className={classNames(
                defaultFlexClasses,
                "col-span-3 justify-center gap-8"
              )}
            >
              <P>
                Team members <Strong>imagine new workflows</Strong> and{" "}
                <Strong>package them with assistants</Strong> that&nbsp;others
                can and effortlessly&nbsp;use.
              </P>
              <Separator color="sky" />
              <P>
                Spread good practices &&nbsp;encourage collaboration with{" "}
                <Strong>@mentions in&nbsp;Dust conversations</Strong> and{" "}
                <Strong>Slack&nbsp;integration</Strong>.
              </P>
              <Separator color="emerald" />
              <P>
                Manage workspace invitations seamlessly&nbsp;with{" "}
                <Strong>single sign&nbsp;on</Strong>&nbsp;(SSO).
              </P>
              <Separator color="amber" />
            </div>
            <div className="col-span-3">
              <ReactiveImg containerPaddingCSS="p-6">
                <img src="/static/landing/assistants.png" />
              </ReactiveImg>
            </div>
          </Grid>

          <Grid>
            <div
              ref={scrollRef3}
              className={classNames(
                defaultFlexClasses,
                "col-span-4 flex flex-col gap-4"
              )}
            >
              <H2 color="text-red-400">
                Designed for security
                <br />
                <H2 isSpan color="text-red-200">
                  and data privacy.
                </H2>
              </H2>
              <P>
                <Strong>Your data is private</Strong>: No re-training
                of&nbsp;models on your internal knowledge.{" "}
                <Strong>Enterprise-grade security</Strong> to manage
                your&nbsp;data access policies with control and&nbsp;confidence.
                <br />
              </P>
            </div>
            <div
              className={classNames(
                defaultFlexClasses,
                "col-span-4 flex flex-col gap-4"
              )}
            >
              <H2 color="text-emerald-500">
                Need more?
                <br />
                <H2 isSpan color="text-emerald-200">
                  Dust do it!
                </H2>
              </H2>
              <P>
                Provide{" "}
                <Strong>developers and tinkerers with a&nbsp;framework</Strong>{" "}
                to&nbsp;build custom actions and&nbsp;application orchestration
                to&nbsp;fit your team’s&nbsp;exact&nbsp;needs.
              </P>
              <P>
                Support <Strong>custom plugins</Strong> for assistants to
                interact with your{" "}
                <Strong>own databases on advanced use cases</Strong>.
              </P>
            </div>
            <div
              className={classNames(
                defaultFlexClasses,
                "col-span-4 flex flex-col gap-4"
              )}
            >
              <div className="w-full">
                <ReactiveImg innerPaddingCSS="p-1" containerPaddingCSS="p-42">
                  <img src="/static/landing/apps.png" />
                </ReactiveImg>
              </div>
            </div>
          </Grid>
          <Grid>
            <div
              className={classNames(
                defaultFlexClasses,
                "s-dark dark col-span-12 flex flex-col gap-4"
              )}
            >
              <H2>Pricing</H2>
              <PriceTable.Container>
                <PriceTable
                  title="Free"
                  price="$0"
                  priceLabel=""
                  color="emerald"
                >
                  <PriceTable.Item size="sm" label="One user" variant="dash" />
                  <PriceTable.Item
                    size="sm"
                    label="One workspace"
                    variant="dash"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Privacy and Data Security"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Advanced LLM models (GPT-4, Claude, …)"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Unlimited custom assistants"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="100 messages with Assistants"
                    variant="dash"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="50 documents as data sources"
                    variant="dash"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="No connections"
                    variant="xmark"
                  />
                  <PriceTable.ActionContainer>
                    <Button variant="primary" size="md" label="Start testing" />
                  </PriceTable.ActionContainer>
                </PriceTable>

                <PriceTable
                  title="Pro"
                  price="$29"
                  color="sky"
                  priceLabel="/ month / seat"
                >
                  <PriceTable.Item size="sm" label="From 1 user" />
                  <PriceTable.Item
                    size="sm"
                    label="One workspace"
                    variant="dash"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Privacy and Data Security"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Advanced LLM models (GPT-4, Claude, …)"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Unlimited custom assistants"
                  />
                  <PriceTable.Item size="sm" label="Unlimited messages" />
                  <PriceTable.Item
                    size="sm"
                    label="Up to 1Go/user of data sources"
                  />
                  <PriceTable.Item
                    label="Connections
(GitHub, Google Drive, Notion, Slack)"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Single Sign-on (Google, GitHub)"
                  />
                  <PriceTable.Item size="sm" label="Dust Slackbot" />
                  <PriceTable.Item
                    size="sm"
                    label="Assistants can execute actions"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Workspace role and permissions"
                    variant="dash"
                  />
                  <PriceTable.ActionContainer>
                    <Button variant="primary" size="md" label="Start now" />
                  </PriceTable.ActionContainer>
                </PriceTable>

                <PriceTable title="Enterprise" price="Custom">
                  <PriceTable.Item size="sm" label="From 100 users" />
                  <PriceTable.Item size="sm" label="Multiple workspaces" />
                  <PriceTable.Item
                    size="sm"
                    label="Privacy and Data Security"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Advanced LLM models (GPT-4, Claude, …)"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Unlimited custom assistants"
                  />
                  <PriceTable.Item size="sm" label="Unlimited messages" />
                  <PriceTable.Item size="sm" label="Unlimited data sources" />
                  <PriceTable.Item
                    label="Connections
(GitHub, Google Drive, Notion, Slack)"
                  />
                  <PriceTable.Item size="sm" label="Single Sign-on" />
                  <PriceTable.Item size="sm" label="Dust Slackbot" />
                  <PriceTable.Item
                    size="sm"
                    label="Assistants can execute actions"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Advanced workspace role and permissions"
                  />
                  <PriceTable.Item
                    size="sm"
                    label="Dedicated account support"
                  />
                  <PriceTable.ActionContainer>
                    <Button variant="secondary" size="md" label="Contact us" />
                  </PriceTable.ActionContainer>
                </PriceTable>
              </PriceTable.Container>
            </div>
          </Grid>
          <div className={defaultFlexClasses}>
            <H2 color="text-red-400">
              Our product{" "}
              <H2 isSpan color="text-red-200">
                constitution
              </H2>
            </H2>
            <div className="grid gap-4 text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              <div className={defaultFlexClasses}>
                <H4>Augmenting humans, not&nbsp;replacing&nbsp;them</H4>
                <P>
                  We're optimistic about making work life better for smart
                  people. We're building R2-D2, not Skynet.
                </P>
              </div>
              <div className="flex flex-col gap-3">
                <H4>Uncompromising on data security&nbsp;&&nbsp;privacy</H4>
                <P>
                  We aspire to define standards rather than simply abide by
                  the&nbsp;existing ones.
                </P>
              </div>
              <div className="flex flex-col gap-3">
                <H4>Hard problems over&nbsp;hype</H4>
                <P>
                  There's more to do than wrapping GPT into a chat UI. We're in
                  this to solve hard problems on user experience and product
                  quality.
                </P>
              </div>
              <div className="flex flex-col gap-3">
                <H4>Building with an&nbsp;AI&nbsp;core</H4>
                <P>
                  We're building with large language models in mind from the
                  ground up, rather than sprinkling them here and&nbsp;there.
                </P>
              </div>
            </div>
          </div>
        </div>

        <Footer />
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
             window.dataLayer = window.dataLayer || [];
             function gtag(){window.dataLayer.push(arguments);}
             gtag('js', new Date());

             gtag('config', '${gaTrackingId}');
            `}
          </Script>
        </>
      </main>
    </>
  );
}

const Header = () => {
  return (
    <Head>
      <title>
        Dust - Amplify your team's potential with customizable and secure AI
        assistants
      </title>
      <link rel="shortcut icon" href="/static/favicon.png" />

      <meta name="apple-mobile-web-app-title" content="Dust" />
      <link rel="apple-touch-icon" href="/static/AppIcon.png" />
      <link
        rel="apple-touch-icon"
        sizes="60x60"
        href="/static/AppIcon_60.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="76x76"
        href="/static/AppIcon_76.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="120x120"
        href="/static/AppIcon_120.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="152x152"
        href="/static/AppIcon_152.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="167x167"
        href="/static/AppIcon_167.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/static/AppIcon_180.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="192x192"
        href="/static/AppIcon_192.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="228x228"
        href="/static/AppIcon_228.png"
      />

      <meta
        id="meta-description"
        name="description"
        content="Dust is an AI assistant that safely brings the best large language models, continuously updated company knowledge, powerful collaboration applications, and an extensible platform to your team's fingertips."
      />
      <meta
        id="og-title"
        property="og:title"
        content="Dust - Secure AI assistant with your company's knowledge"
      />
      <meta id="og-image" property="og:image" content="/static/og_image.png" />

      <link rel="stylesheet" href="https://use.typekit.net/lzv1deb.css"></link>
    </Head>
  );
};

const Footer = () => {
  return (
    <div className="mt-48 flex w-full flex-col gap-6 border-t border-slate-800 bg-slate-900 px-12 pb-20 pt-12">
      <div className="opacity-70">
        <LogoHorizontalWhiteLogo className="h-6 w-24" />
      </div>
      <div className="grid w-full gap-4 text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="https://dust-tt.notion.site/Legal-Notice-58b453f74d634ef7bb807d29a59b3db1">
          Legal
        </Link>
        <Link href="/website-privacy">Website Privacy</Link>
        <Link href="/platform-privacy">Platform Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="https://dust-tt.notion.site/Cookie-Policy-ec63a7fb72104a7babff1bf413e2c1ec">
          Cookies
        </Link>
      </div>
    </div>
  );
};
