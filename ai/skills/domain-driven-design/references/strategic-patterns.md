# Strategic design: preserving model integrity across teams

## The problem

Large projects involve multiple teams under different management, working in
parallel on interconnected parts of one big model. A developer on team B needs
functionality missing from team A's module, adds it, and checks it in. That is a
change to the *model*, and it may well break behavior elsewhere — because nobody
holds the whole model in their head. Everyone knows their own backyard.

The first requirement of a model is consistency: invariable terms, no
contradictions. That internal consistency is called **unification**.

**The counterintuitive conclusion:** a single unified enterprise-wide model is
an ideal that is rarely achievable and sometimes not worth attempting. Teams
need independence; they don't have time to constantly meet and reconcile.
Striving to maintain one large unified model will not preserve model integrity —
it will produce a model that falls apart later.

**So divide the model deliberately.** Several well-integrated models can evolve
independently as long as they honor the contracts binding them. Each model gets
a clearly delimited border, and the relationships between models are defined
with precision.

---

## Bounded Context

**Definition.** The explicit scope within which a particular model applies — the
set of conditions under which the model's terms have their specific meaning.

Every model has a context. With a single model the context is implicit and needs
no statement. Interacting with a legacy application makes it obvious that two
separate models and contexts are in play. On a large enterprise application you
must define the context for each model you create, because when code based on
distinct models is combined the software becomes buggy, unreliable, and hard to
understand, and team communication gets confused. It is often unclear where a
model should *not* be applied.

**Rules.**
- Explicitly define the context within which a model applies.
- Set boundaries explicitly in terms of **team organization**, **usage within
  specific parts of the application**, and **physical manifestations** such as
  code bases and database schemas.
- Keep the model strictly consistent within those bounds — and don't be
  distracted or confused by issues outside them.
- There is no formula for dividing a large model. Put together elements that are
  related and form a natural concept. A model should be small enough to be
  assigned to one team.
- **A Bounded Context is not a Module.** The Bounded Context is the logical frame
  within which a model evolves; Modules organize elements *inside* a model. The
  Context encompasses the Modules.

**What it buys you.** Everyone works freely inside known limits. Each model can
be refactored, refined and distilled toward purity without repercussions on
other models.

**What it costs.** You must define borders and inter-model relationships — extra
design effort, plus translation between models. You cannot freely pass objects
across a boundary or invoke behavior as if the boundary weren't there.

*Example.* An e-commerce system covering online shopping, warehouse/mailing
notification, and reporting. The instinct is one model, because it was
commissioned as one application. But shopping and reporting have separate
concerns, operate on different concepts, and may use different technologies —
the only real overlap is that customer and merchandise data lives in a shared
database. Separate models let each evolve freely, possibly into separate
applications. The warehouse side needs only purchase information, which the shop
can send as Value Objects over asynchronous messaging; there's no need for the
shop's model to cover warehouse operations.

---

## Continuous Integration

Once a Bounded Context is defined, keep it sound. When several people work in
one Bounded Context, the model tends to fragment — the bigger the team the
worse, but three or four people is enough to cause serious problems. Someone who
doesn't understand the relationships between objects modifies code in a way that
contradicts the original intent. Someone duplicates existing code without
knowing it, or duplicates rather than changing existing code out of fear of
breaking things.

Meanwhile, breaking the system into ever-smaller contexts eventually costs you a
valuable level of integration and coherency. Contexts should not be a way to
avoid talking to each other.

A model is never fully defined up front; it evolves on new insight and
implementation feedback. New concepts enter, new elements are added — and all of
them must integrate into one unified model and be implemented correctly.

**Practices:**
- Communicate within the team so everyone understands the role each element
  plays in the model.
- Merge code as soon as possible; for a single small team, daily merges.
- Automate the build so merged code can be tested.
- Maintain an automated test suite and run it on every build; fix reported errors
  early, then merge/build/test again.

Continuous Integration integrates *concepts in the model* first, which then find
their way into the implementation where they are tested — any inconsistency in
the model shows up in the implementation.

**Scope: Continuous Integration applies within a Bounded Context.** It is not
the mechanism for handling relationships between neighboring contexts.

---

## Context Map

**Definition.** A document — a diagram, or any written form — outlining the
different Bounded Contexts and the relationships between them.

Separate unified models are not enough; each model's functionality is only part
of the system, and the pieces must ultimately assemble and work. Undefined
contexts overlap; unmapped relationships fail at integration time.

**Rules.**
- Use the context as the basis for **team organization**. People in one team
  communicate more easily and integrate model and implementation better.
- Everyone working on the project shares and understands the Context Map. The
  level of detail may vary; the shared understanding may not.
- **Every Bounded Context gets a name that is part of the Ubiquitous Language.**
- Everyone should know each context's boundaries and the mapping from contexts
  to code. Common practice: define the contexts, create modules per context, and
  use a naming convention indicating which context a module belongs to.

The patterns below are the vocabulary for the relationships a Context Map
records.

---

## Choosing a relationship pattern

| Situation | Pattern |
|---|---|
| Two teams, closely related applications, overlap worth sharing | **Shared Kernel** |
| One context's output feeds another; downstream depends on upstream; same management | **Customer/Supplier** |
| Upstream won't cooperate, but its model is good enough to adopt as-is | **Conformist** |
| Upstream model is poor, or foreign, or legacy — and you must protect yours | **Anticorruption Layer** |
| Integration costs more than it's worth | **Separate Ways** |
| One subsystem must serve many others | **Open Host Service** |

---

## Shared Kernel

**When.** Functional integration between contexts is limited, so full Continuous
Integration across them looks too expensive — or the teams lack the skill or
political organization to sustain it, or a single team would be too big and
unwieldy. Meanwhile, uncoordinated teams on closely related applications race
ahead and produce things that don't fit, then spend more on translation layers
and retrofitting than integration would have cost, duplicating effort and losing
the benefits of a common Ubiquitous Language.

**Solution.** Designate a subset of the domain model that the two teams agree to
share — along with the associated subset of code and database design.

**Rules.**
- The shared material has special status and **must not be changed without
  consulting the other team**.
- Integrate the functional system frequently, but somewhat less often than the
  pace of Continuous Integration within each team.
- **Run both teams' tests during those integrations.**
- If teams work on separate copies of the kernel code, merge at least weekly.
- Keep a test suite over the kernel so every change is tested immediately.
- Communicate every kernel change to the other team, so they know about new
  functionality.

The purpose is to reduce duplication while still keeping two separate contexts.
It needs real care.

---

## Customer/Supplier

**When.** Two subsystems in different contexts where one depends heavily on the
other — the upstream's processing result feeds the downstream. A Shared Kernel
isn't right, either because it isn't conceptually correct or because sharing
code isn't technically possible (different technologies, genuinely different
core concepts).

*Example.* E-shopping (supplier) and reporting (customer). The shop doesn't care
what happens to its data; the reporting system needs that data plus extras —
abandoned baskets, which links get visited — that mean nothing to the shop.
Reporting also needs stability in a database schema the shop would otherwise
change freely.

The failure modes if you leave it informal: give the supplier veto rights and
you throttle the customer team; let the supplier act independently and they will
eventually break agreements the customer wasn't prepared for.

**Rules.**
- Establish an explicit customer/supplier relationship between the teams.
- In planning sessions, the customer team **plays the customer role** to the
  supplier team; they meet regularly or on request.
- Negotiate and budget tasks for customer requirements so that everyone
  understands the commitment and the schedule.
- All the customer team's requirements get met eventually, but **the supplier
  team decides the timetable** — important requirements sooner, others deferred.
- The supplier also shares input and knowledge with the customer team.
- Define the interface between the subsystems precisely.
- **Jointly develop automated acceptance tests validating the expected
  interface. Add them to the supplier's test suite, run as part of its continuous
  integration.** This is what frees the supplier to change their design without
  fear of side effects downstream.

**Precondition.** This works well when both teams are under the same management —
it eases decision-making and creates harmony.

---

## Conformist

**When.** A Customer/Supplier relationship where the supplier team has no
motivation to serve the customer's needs. Maybe management never decided how the
two teams relate, maybe management is absent, maybe the teams are in different
companies. Even well-intentioned suppliers under deadline pressure drift toward
their own model and design. Altruistic promises go unfulfilled; the customer
team plans around features that never arrive and gets delayed until it learns to
live with what it's given. An interface tailored to the customer team's needs is
not on offer.

**The customer team's options:**

1. **Separate Ways** — sometimes the supplier subsystem simply isn't worth the
   trouble, and a separate model is simpler.
2. **Anticorruption Layer** — if the supplier's model has value but is poorly
   conceived and awkward to use, insulate yourself with a translation layer.
3. **Conformist** — if the supplier's model has value *and is well done*, adhere
   to it entirely, conforming to it as part of your own model and building on
   the code provided.

**Conformist vs. Shared Kernel.** They look similar, and the difference is
decisive: **the customer team cannot change the kernel.** They can only use it.

When someone provides a rich component with an interface, you can build your
model including that component as though it were your own. If the component has
a *small* interface, it may be better to write an adapter and translate between
your model and the component's — isolating your model and keeping your freedom.

---

## Anticorruption Layer

**When.** Your application must interact with legacy software or a separate
external application. Many legacy systems were not built with domain modeling,
so their model is confused, entangled, and hard to work with. Even a well-built
external model is of little use to you, because yours is likely quite different.

**Why "primitive data" is not a safe boundary.** Interaction happens over a
network protocol or a shared database, and it looks like you're just moving
primitive data. You aren't. A relational database is primitive data related to
other primitive data in a web of relationships, and the semantics behind it
matter — you cannot read or write it without understanding the meaning. Parts of
the external model are reflected in that data and will make their way into
yours.

**Solution.** Build an Anticorruption Layer standing between your model and the
external one.

**Properties.**
- From your model's perspective, the layer is a natural part of the model — it
  operates in concepts and actions familiar to you and doesn't look foreign.
- Toward the external system, it speaks the *external* language.
- It is a two-way translator between two domains and two languages.
- The result: your model stays pure and consistent, uncontaminated.

**Implementation.**
- Expose the layer as a **Service** from your model's point of view. A Service
  abstracts the other system and lets you address it in your own terms.
- Implement each Service as a **Façade**.
- Add an **Adapter** to convert the external interface into the one your client
  understands. (Here the Adapter isn't necessarily wrapping a single class — its
  job is to translate between systems.)
- Add a **Translator** for object and data conversion — often a very simple
  object serving the basic data-translation need.
- **One Adapter per Façade, one Façade per Service.** Do not use a single Adapter
  for all Services; it becomes cluttered with mixed functionality.
- If the external system's interface is complex, put an additional Façade
  between the adapters and that interface, to simplify the Adapter's protocol
  and separate it from the other system.

---

## Separate Ways

**When.** Integration has real costs: ironing out relationships between
subsystems, constant merging, testing to confirm nothing broke, one team
spending significant time implementing another team's requirements. There are
compromises too — altering your model to fit another system's framework, or
introducing translation layers. Evaluate the benefits of integration closely and
integrate only where there is real value.

**The pattern.** An enterprise application may be several smaller applications
with little or nothing in common from a modeling perspective. There's one set of
requirements, and from the user's perspective one application — but from a
modeling and design perspective it can be separate models with distinct
implementations.

**Rules.**
- Examine the requirements: can they be divided into two or more sets with little
  in common? If so, create separate Bounded Contexts and model independently.
- Each context is then free to choose its own implementation technologies.
- A shared thin GUI acting as a portal with links or buttons into each
  application is acceptable — that's organizing the applications, not the models
  behind them.
- **Before going Separate Ways, be confident you won't need to come back.**
  Independently developed models are very difficult to integrate later; they have
  so little in common that it isn't worth doing.

---

## Open Host Service

**When.** Integrating two subsystems normally means a translation layer buffering
the client from the external subsystem. If the external subsystem serves not one
client but several, you end up building a translation layer per client, all
repeating the same translation work with similar code. Customizing a translator
for each integration bogs the team down: more to maintain, more to worry about
on every change.

**Solution.** Treat the subsystem as a provider of services. Wrap a set of
Services around it and let all clients access those Services — no per-client
translation layer.

**Rules.**
- Define a protocol giving access to your subsystem as a set of Services.
- Open the protocol so anyone needing to integrate can use it.
- Enhance and expand the protocol to handle new integration requirements.
- **Exception:** when a single team has idiosyncratic needs, use a one-off
  translator to augment the protocol for that case, so the shared protocol stays
  simple and coherent.

The difficulty to watch for: each client may need to interact in its own way, so
producing a coherent set of Services can be genuinely hard.

---

## Distillation: Core Domain and Generic Subdomains

**The problem.** A large domain has a large model even after refinement,
abstraction, and many refactorings. With so many contributing components — all
complicated, all necessary — the essence of the domain model, the real business
asset, gets obscured and neglected.

**Distillation** separates the essential from the generic. What you extract is
the **Core Domain**; the byproducts are **Generic Subdomains**.

*Example.* In air traffic monitoring, `Route` feels omnipresent — but routing is
a generic concept used in many domains. The essence is elsewhere: taking radar
input on the plane's actual path, computing its four-dimensional trajectory from
current flight parameters, aircraft characteristics and weather, over horizons
from minutes to hours, and issuing an alert when two trajectories may intersect.
The trajectory-synthesis module is the heart of that business system. Routing is
a generic subdomain.

**The Core is relative.** A simple routing system would treat `Route` and its
dependencies as central. One application's Core Domain is another's generic
subdomain. Identify your Core correctly, and determine its relationships to the
rest of the model.

### Rules for the Core Domain

- Boil the model down. Find the Core Domain and **provide a means of easily
  distinguishing it** from the mass of supporting model and code.
- Emphasize the most valuable and specialized concepts. **Make the Core small.**
- **Apply your top talent to the Core Domain**, and recruit accordingly.
- Spend the effort in the Core to find a deep model and develop a supple design —
  sufficient to fulfill the vision of the system.
- **Justify investment in any other part by how it supports the distilled Core.**
- The Core rarely emerges in one step. Expect a process of refinement and
  successive refactorings. Once it emerges, enforce it as the central piece of
  the design, delimit its boundaries, and rethink the other model elements in
  relation to it — they may need refactoring, and some functionality may need to
  move.

**The staffing problem is real.** Developers gravitate toward technology and
infrastructure; business logic looks boring and unrewarding, and the domain
knowledge feels disposable once the project ends. But the business logic is the
heart of the domain, and mistakes in designing and implementing the Core can
lead to abandoning the project outright. If the core business logic doesn't do
its job, the technological bells and whistles amount to nothing.

### Rules for Generic Subdomains

Some parts of the model add complexity without capturing or communicating
specialized knowledge — general principles everyone knows, or details from
specialties that are not your focus but play a supporting role. They're
essential to the system functioning, and they make the Core harder to discern.

- **Identify cohesive subdomains that are not the motivation for your project.**
- Factor out generic models of them and place them in **separate Modules**.
- **Leave no trace of your specialties in them.**
- Once separated, give their continued development **lower priority** than the
  Core.
- **Avoid assigning your core developers** to them — they'll gain little domain
  knowledge from the work.
- Consider off-the-shelf solutions or published models.

Common examples: money, currency and exchange rates; charting.

**Four ways to implement a Generic Subdomain:**

1. **Off-the-shelf solution.** Someone else already did the whole thing. Costs: a
   learning curve, new dependencies, waiting on someone else to fix bugs,
   constraints on compiler and library versions, and integration that is harder
   than in-house.
2. **Outsourcing.** Hand design and implementation to another team, freeing you
   to focus on the Core. Costs: integrating the outsourced code, and defining and
   communicating the interface to the other team.
3. **Existing model.** Use a published analysis pattern as a starting point.
   Rarely copyable verbatim, but many work with small changes.
4. **In-house implementation.** Best integration; costs extra effort plus the
   maintenance burden.
