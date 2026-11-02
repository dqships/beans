/**
 * Copy for Contact, Privacy and Terms, shared by their HTML pages and their
 * markdown versions. Write it in the small markdown that `MarkdownBody` reads:
 * `## ` headings, `- ` lists, `**bold**` and `[links](/path)`.
 *
 * When PostHog goes live, add this to Privacy under "Who else handles it",
 * and a line under "What we collect":
 * - **PostHog** records page views, clicks and errors in the website and the
 *   planner, with your browser and device type, linked to your account once
 *   you sign in. Session replay is off.
 */

export const operator = "FollowUs AI LLC";
export const supportEmail = "support@followusai.com";
export const legalUpdated = "November 2, 2026";

const mail = `[${supportEmail}](mailto:${supportEmail})`;

export const contactBody = `Email ${mail} for anything about Beans: help with the planner, billing, refunds, your account or your data. We aim to reply within one business day.

## What to include

- The email address on your Beans account.
- What you were doing, what you expected and what happened instead.
- Your browser and device, and a screenshot if you can.

## Common requests

- **Cancel your subscription.** Open Settings in the planner and choose Manage subscription. You keep access until the end of the period you paid for.
- **Get a refund.** Email us within 14 days of a charge and we'll refund it in full. The [terms](/terms) have the details.
- **Delete your account.** Email us from your account's email address and we'll delete your account and your tasks, and cancel any subscription.
- **Get a copy of your data.** Email us from your account's email address and we'll send it.

## Who makes Beans

Beans is made by ${operator}, a small software company in Michigan, USA. There's no phone line or office open to visitors, so email is the way to reach us.

The [privacy policy](/privacy) says what Beans stores and why.`;

export const privacyBody = `Beans is a daily planner run by ${operator} ("we"). This policy says what Beans collects, why, who else handles it, and what you can do about it.

- We don't sell your information or use it for advertising.
- Your tasks are private to your account. We don't read them unless you ask us to while we help you.
- We don't use your tasks to train AI models.

## What we collect

- **Your account.** Your name, email address, profile photo and how you sign in. If you sign in with another account, such as Google, we receive your name, email address and photo from it.
- **Your planner.** Tasks, notes, subtasks, lists, labels, estimates, timer history, repeats, templates and settings, including your time zone, so unfinished tasks can move to the next day at your midnight.
- **Billing.** When you subscribe, Stripe collects your payment details. We never see your full card number. Stripe tells us your plan, trial and subscription status, billing country, card brand and last four digits, and your invoices.
- **How the site is used.** Vercel Web Analytics counts page views, with the referring site, country, browser, operating system and device type. It uses no cookies and doesn't identify you across days. Our hosting also logs requests, including IP addresses, to keep the service running and secure.
- **Messages to us.** If you email us, we keep the message and anything you attach.

## Cookies and local storage

Clerk sets the cookies that keep you signed in. Stripe sets its own cookies on its checkout and billing pages, to prevent fraud. Beans saves your theme and a few display choices in your browser's local storage. We don't use advertising cookies.

## How we use it

- To run the planner: save your tasks, sync them between your devices and move unfinished tasks to the next day.
- To take payments and manage your trial and subscription.
- To answer your emails and fix problems you report.
- To keep Beans secure and prevent fraud and abuse.
- To see which pages are visited, so we can improve the site.
- To send emails the service needs, such as sign-in codes from Clerk and receipts from Stripe. We don't send marketing emails unless you've agreed to them.

If you're in the European Economic Area or the UK: we use your information to provide the service you signed up for (contract), to keep it secure and improve it (our legitimate interests), to keep tax and billing records (legal obligation), and with your consent where we ask for it.

## Who else handles it

These companies process information for us, only to provide their part of Beans:

- **Clerk** handles sign-in and your account details.
- **Convex** stores your planner and runs the server code that syncs it.
- **Stripe** processes payments and manages subscriptions and invoices.
- **Vercel** hosts the website and provides Web Analytics.

We may also share information if the law requires it, to protect people's safety, or as part of a sale or merger of the business, in which case this policy would still apply to it.

These providers store data in the United States. When information moves from the European Economic Area or the UK to the US, they rely on safeguards such as Standard Contractual Clauses.

## How long we keep it

- Your account and planner are kept for as long as you have an account.
- Tasks you delete stay in Trash for 30 days, so you can undo, and are then removed.
- When you delete your account, we remove your account and planner within 30 days. Copies in backups are removed when those backups expire.
- Billing records are kept for as long as tax and accounting law requires.
- Emails to us are kept for as long as they help us support you.

## Your choices and rights

- Change your name, email address, photo or password in Settings, under Manage account.
- Cancel your subscription in Settings, under Manage subscription.
- Ask for a copy of your data, or to delete your account, by emailing ${mail} from your account's email address. Deleting your account also cancels your subscription.

Depending on where you live, you may have the right to access, correct, delete or export your information, to object to or limit how we use it, and to withdraw consent. We'll answer requests within 30 days. If you're in the EEA or the UK, you can also complain to your data protection authority.

If you live in California: we don't sell or share your personal information as the California Consumer Privacy Act defines those terms, and we won't treat you differently for using your rights.

## Children

Beans isn't for children under 13, and we don't knowingly collect information from them. If you think a child under 13 has an account, email us and we'll delete it.

## Security

Beans uses encrypted connections, and only the people who run Beans can reach its systems. No service can promise perfect security, so tell us right away if you think your account has been misused.

## Changes to this policy

When we change this policy, we update the date at the top. If a change affects how we use information you've already given us, we'll tell you by email or in the planner before it takes effect.

## Contact

${operator}, Michigan, USA. Email ${mail}.`;

export const termsBody = `These terms are an agreement between you and ${operator} ("we"), which runs Beans. By creating an account or using Beans, you agree to them. If you don't agree, please don't use Beans.

## What Beans is

Beans is a daily planner that runs in your browser. You write down tasks, plan them across your days and give them times on a Timebox.

## Your account

- You need an account to use the planner. Give us accurate details and keep your sign-in secure. You're responsible for what happens in your account.
- You must be at least 13. If you're under 18, or under the age of majority where you live, a parent or guardian must agree to these terms for you.
- An account is for one person.

## Free trial

New accounts get a 7-day free trial. Checkout shows what you'll pay when the trial ends and whether a payment method is needed to start. If you start a trial with a payment method, your subscription begins when the trial ends and you're charged then, unless you cancel before it ends.

## Subscriptions and billing

- Beans is a paid subscription. The price and billing period are shown on the pricing page and at checkout before you pay. Any sales tax or VAT is shown at checkout.
- Stripe processes payments. By subscribing, you allow us to charge your payment method through Stripe at the start of each billing period until you cancel.
- Your subscription renews automatically at the end of each billing period.
- If a payment fails, Stripe tries again. If it still can't be collected, your subscription may end. Your account and tasks stay saved.
- If we change the price, we'll tell you at least 30 days before your subscription renews at the new price, and you can cancel before then.

## Cancelling and refunds

- Cancel any time in Settings, under Manage subscription, or by emailing us. Cancelling stops the next renewal, and you keep access until the end of the period you've paid for.
- If you're charged and change your mind, email ${mail} within 14 days of that charge and we'll refund it in full.
- After 14 days, charges aren't refunded, except where the law requires it.
- Ending a subscription doesn't delete your account or your tasks.

## Discount codes

We sometimes offer discount codes, such as at launch. Each code has its own discount, length, limit on how many people can use it, and end date, shown with the offer and at checkout. A code works only for a new subscription, can't be combined with another code and has no cash value. When the discount ends, your subscription renews at the regular price shown at checkout.

## Your tasks

You own what you put in Beans. You give us permission to store, copy and show it only as needed to run Beans for you, such as syncing it between your devices and keeping backups. The [privacy policy](/privacy) explains how we handle it.

## Using Beans fairly

Don't use Beans to break the law, to get into other people's accounts or our systems, to send malware, or to overload or disrupt the service. Don't scrape Beans, resell it, or copy its design or code to build a competing product.

## Changes to Beans

We keep improving Beans, so features may change. We work to keep it running, but we can't promise it will always be available or free of errors. If we ever shut Beans down, we'll tell you at least 30 days before, and refund any time you've paid for but can't use.

## Ending your account

You can stop using Beans and ask us to delete your account at any time by emailing ${mail}. We may suspend or close an account that breaks these terms or puts Beans or other people at risk. Where we can, we'll tell you first and give you a chance to get a copy of your data.

## Disclaimer

Beans is provided "as is". To the extent the law allows, we don't make promises about it beyond what these terms say, including that it will meet your needs. Beans helps you plan, but you're responsible for your own schedule, deadlines and decisions.

## Limit of liability

To the extent the law allows, we aren't liable for indirect or consequential losses, such as lost profits or missed deadlines, and our total liability for any claim about Beans is limited to the greater of what you paid us in the 12 months before the claim and $50. Nothing in these terms limits rights you have under consumer law that can't be waived.

## Governing law

These terms are governed by the laws of the State of Michigan, USA. Any dispute goes to the state or federal courts in Genesee County, Michigan, and either of us may use small claims court where it applies. If you're a consumer in the European Economic Area or the UK, you also keep the protection of your home country's laws and can bring a claim in its courts.

## Changes to these terms

When we change these terms, we update the date at the top. For a change that matters, we'll tell you by email or in the planner at least 14 days before it applies. If you keep using Beans after that, the new terms apply.

## Contact

${operator}, Michigan, USA. Email ${mail}.`;
