# Tactical patterns: the building blocks of a model-driven design

These patterns express a model in code. They interlock: Entities and Value
Objects express the model; Aggregates cluster them; Factories create them;
Repositories retrieve them; Services hold the operations none of them own;
Modules organize the whole; and Layered Architecture keeps the domain isolated
from everything else.

---

## Layered Architecture

**Problem.** In most applications, domain code is a minority of the codebase.
Left unguarded, UI code, persistence code, and framework code get written
directly into business objects, and business logic gets embedded in widgets and
database scripts. Then a superficial UI change alters business behavior,
changing one rule requires tracing UI and DB code, and automated testing gets
awkward.

**Solution.** Partition the program into layers. Each layer is internally
cohesive and depends only on the layers below it; coupling upward is loose and
mediated by standard architectural patterns.

| Layer | Responsibility |
|---|---|
| **User Interface / Presentation** | Present information to the user; interpret user commands. |
| **Application** | Thin. Coordinates activity. Holds no business logic and no business-object state — it may hold the state of a task's progress. |
| **Domain** | The heart. Domain information and business-object state live here. Persistence is *delegated* to infrastructure. |
| **Infrastructure** | Supporting library for all other layers: persistence, messaging between layers, UI support libraries. |

**Rules.**
- Concentrate all domain-model code in the domain layer and isolate it from UI,
  application, and infrastructure code.
- Domain objects are freed from displaying themselves, storing themselves, and
  managing application tasks. That freedom is what lets the model get rich
  enough to be worth having.
- The application layer supervises and coordinates; it does not decide.

**Typical flow.** A user asks to book a flight route. The application service
fetches the relevant domain objects via infrastructure, invokes domain methods
on them (e.g. checking safety margins against already-booked flights), and once
the domain objects have run their checks and reached a decided state, the
application service persists them through infrastructure.

---

## Entities

**Definition.** An object defined not by its attributes but by a thread of
continuity and identity that spans the life of the system and may extend beyond
it.

**What identity is not.** The runtime object reference or memory address. Those
are unstable — objects are paged out, serialized across the network and
reconstituted, destroyed. Two weather-reading objects holding identical values
are equal and interchangeable despite distinct references; they are not
entities.

**What identity is.** Something the *model* defines. It may be:
- a single attribute (a bank account number),
- a combination of attributes (name + date of birth + place of birth + parents'
  names + current address for a person),
- an attribute created specifically to carry identity (a generated ID, a
  database primary key),
- an externally assigned code (IATA airport codes),
- or even a behavior.

**Rules.**
- When an object is distinguished by identity rather than attributes, make that
  primary in its definition. Keep the class simple and focused on life-cycle
  continuity and identity.
- Define a means of distinguishing each object *regardless of its form or
  history*.
- Define an operation guaranteed to produce a unique result per object.
- The model must define what it means to be the same thing.
- Be alert to requirements that call for matching objects by attributes — that's
  often an identity question in disguise.
- Two objects with different identities must be easily distinguished by the
  system; two with the same identity must be treated as the same. Mistaken
  identity corrupts data.

Identify Entities early — they are among the first things to settle in the
modeling process.

---

## Value Objects

**Definition.** An object that describes some aspect of the domain and has no
identity. What matters is *what attributes it has*, not *which object it is*.

**Why not make everything an Entity.** Identity has real cost: you must
guarantee uniqueness, decide carefully what constitutes identity (a wrong
decision produces colliding identities), and track it. There are also
performance consequences — an Entity needs one instance per real-world thing,
which degrades badly at thousands of instances. Uniformity is not a reason to
make everything an Entity.

**Rules.**
- Select as Entities only the objects that genuinely meet the Entity definition;
  make the rest Value Objects. This simplifies the design.
- **Make Value Objects immutable.** Construct them fully; never modify them.
  Want a different value? Create a new object.
- **Golden rule: if a Value Object is shareable, it must be immutable.** Sharing
  a mutable value is how one customer's flight-code change silently rewrites
  another customer's booking.
- Immutability buys safe sharing (a performance win) and data integrity.
- Keep them thin and simple. Pass them by value, or hand out copies — copying is
  cheap and consequence-free when there is no identity.
- Value Objects may contain other Value Objects, and may even hold references to
  Entities.
- **Group attributes that form a conceptual whole.** Don't flatten a long
  attribute list onto one object. `street`, `city`, `state` belong together as
  an `Address` that `Customer` references — they cohere conceptually in a way
  that separate customer fields do not.

---

## Services

**Definition.** A stateless object whose purpose is to provide a domain
operation that belongs to no Entity or Value Object.

**Why they exist.** Developing the Ubiquitous Language, nouns map cleanly to
objects and most verbs attach to those nouns' behavior. But some verbs are
important domain behavior belonging to no single object. Transferring money
between accounts is the canonical case: it sits equally badly on the sending
account and the receiving account. Forcing it onto either spoils that object —
it now stands for functionality that isn't its own.

**The three characteristics of a Service:**
1. The operation refers to a domain concept that doesn't naturally belong to an
   Entity or Value Object.
2. The operation refers to other objects in the domain.
3. The operation is stateless.

**Rules.**
- When a significant process or transformation is not the natural responsibility
  of an Entity or Value Object, add it to the model as a standalone interface
  declared as a Service.
- Define the interface in the language of the model; the operation name must be
  part of the Ubiquitous Language.
- Make it stateless.
- A Service must **not** replace operations that properly belong on domain
  objects, and you should not create a Service per operation. Reserve them for
  operations that stand out as domain concepts in their own right.
- A Service is not about the object performing it; it's about the objects it
  operates on or for. It naturally becomes a connection point for many objects —
  which is exactly why that behavior should not live inside them. Pushing it
  into domain objects creates a dense web of associations, and high coupling
  makes code hard to read and harder to change.

**Which layer?** Services exist in the domain layer, the application layer, and
infrastructure, and separating them is genuinely difficult. The test: if the
operation conceptually belongs to application coordination, it's an application
service. If it's about domain objects and serves a domain need, it's a domain
service. Keep the domain layer isolated either way.

*Example.* A reporting system where reports are generated from templates.
Retrieving the template that corresponds to a given `reportID` belongs neither
to `Report` nor to `Template` — so it becomes a domain Service, which uses file
infrastructure to fetch the template from disk.

---

## Modules

**Purpose.** Organize related concepts and tasks to reduce complexity. A large
model becomes impossible to hold in mind; understanding the modules and their
interactions first, then the internals of one module at a time, is how it
becomes tractable.

**Rules.**
- Group elements that functionally or logically belong together — maximize
  cohesion. *Communicational cohesion* (parts operate on the same data) is good;
  *functional cohesion* (all parts work together to perform one well-defined
  task) is the best.
- Give modules well-defined interfaces. Calling one interface instead of three
  objects inside the module reduces coupling; low coupling reduces complexity
  and raises maintainability.
- **Choose Modules that tell the story of the system** and contain a cohesive
  set of concepts. If that doesn't yield low coupling, that's a signal about the
  *model*: look for a way to disentangle the concepts, or for an overlooked
  concept that would bring the elements together meaningfully.
- Seek low coupling in the sense of concepts that can be understood and reasoned
  about independently.
- **Module names are part of the Ubiquitous Language** and should reflect
  insight into the domain.
- Let modules evolve. Designers tend to fix module roles early and then only
  change internals. Module refactoring is more expensive than class refactoring,
  but working around a known-bad module structure is worse.

---

## Aggregates

**Problem.** Models accumulate associations — one-to-one, one-to-many, and
worst, bidirectional many-to-many. Every traversable association needs an
enforcing mechanism in code and often in the database. Deleting or archiving a
customer means finding and removing every reference. Changing customer data
means propagating consistently. Pushing all of that down to database
transactions produces contention and poor performance. And *invariants* — rules
that must hold whenever data changes — usually apply to closely related groups
of objects, not to discrete ones, which is very hard to guarantee when many
objects hold references to the changing data. Cautious locking schemes just make
users interfere with each other.

**First, simplify the associations.** Before reaching for Aggregates:
1. Remove associations that are not essential to the model. They may exist in
   the domain and still not be needed here.
2. Reduce multiplicity by imposing a constraint — often only one object out of
   many actually satisfies the relationship once the right constraint is stated.
3. Convert bidirectional associations to unidirectional. A car has an engine;
   modeling the reverse direction rarely earns its keep.

The challenge with models is usually not making them complete enough but making
them simple and understandable. Eliminate relations unless they embed deep
understanding of the domain.

**Solution.** An **Aggregate** is a group of associated objects treated as one
unit with regard to data changes, demarcated by a boundary.

**Rules.**
- Each Aggregate has exactly one **root**, which is an Entity, and the root is
  the only object accessible from outside.
- The root may hold references to any object inside; internal objects may
  reference each other; **external objects may hold references only to the
  root**.
- Other Entities inside the boundary have *local* identity — meaningful only
  within the Aggregate. The root has *global* identity.
- The root is responsible for maintaining the invariants. Because all change
  goes through it, it cannot be blindsided.
- The root may pass **transient** references to internal objects outward, on the
  condition that the recipient does not retain them past the operation. Handing
  out copies of Value Objects is the simple way to do this safely.
- If the Aggregate is persisted, **only the root is obtainable by query**. Other
  objects are reached by traversing associations.
- Objects inside an Aggregate *may* hold references to the roots of *other*
  Aggregates.
- When the root is deleted and removed, the rest of the Aggregate goes with it —
  nothing else holds references.

**Why it works.** Enforcing invariants when external objects can directly mutate
internals would require scattering enforcement logic into those external
objects. Routing all access through the root makes it practical to enforce every
invariant, for individual objects and the Aggregate as a whole, on any state
change.

---

## Factories

**Problem.** Entities and Aggregates are often too complex to build in the root
entity's constructor. Doing so is also unlike the domain itself, where things
are made by *other* things — a printer does not build itself. When construction
is laborious, every client acquires knowledge of the object's internal
structure, the relationships among its parts, and the rules governing them. That
breaks encapsulation; if the client is in the application layer, part of the
domain layer has escaped into it.

**Solution.** Shift responsibility for creating complex objects and Aggregates
to a separate object — a **Factory**. It may have no responsibility in the
domain *model*, but it is part of the domain *design*.

**Rules.**
- Provide an interface encapsulating all complex assembly, which does not
  require the client to reference the concrete classes being instantiated.
- **Create entire Aggregates as a unit, enforcing their invariants.** When the
  root is created, everything subject to the invariants must be created too —
  otherwise the invariants cannot be enforced.
- **Creation must be atomic.** A half-completed construction leaves objects in an
  undefined state. For immutable Value Objects this means all attributes reach
  their valid state at creation.
- If an object cannot be created properly, **raise an exception** — never return
  an invalid value.
- When a client needs to create an object that belongs to an Aggregate, add a
  **Factory Method to the Aggregate root**: it creates the object, enforces the
  invariants, wires it into the Aggregate, and returns it (or a copy).
- When construction is more involved — particularly creating a whole Aggregate —
  use a **dedicated Factory class** holding the rules, constraints, and
  invariants. The Aggregate's own objects then stay simple, uncluttered by
  construction logic.
- Creating a Factory forces you to violate the object's encapsulation. Do it
  carefully, and keep the Factory updated whenever construction rules or
  invariants change. This tight coupling is a weakness and also the point.

**Entity Factories vs. Value Object Factories.** Values are immutable: every
attribute must be produced at creation, and the object is valid and final
immediately. Entities are mutable afterward (subject to invariants) and need
identity, which Values do not.

**Use a plain constructor instead when:**
- construction is not complicated;
- creating the object doesn't involve creating others, and all needed attributes
  are passed in;
- the client cares about the implementation — e.g. wants to choose the Strategy;
- the class *is* the type: no hierarchy, so no concrete implementation to choose.

**Reconstitution is not creation.** Bringing a persisted Entity back into memory
differs from creating one: it already has identity, so no new identity is
generated. Invariant violations are also handled differently — a from-scratch
violation raises an exception, but a reconstituted object must somehow be
repaired, or you lose data.

---

## Repositories

**Problem.** To use an object you need a reference to it, obtained either by
creating it or by traversing an association. At scale that forces objects to
retain references they'd otherwise not keep, inflating coupling with
associations nobody needs. The obvious alternative — let clients hit the
database directly — is worse: clients write SQL, result sets expose storage
internals, database access code scatters through the domain, and changing the
underlying store means changing all of it. Worse still, direct database access
can reconstitute an object *internal to an Aggregate*, breaking its
encapsulation. Domain logic migrates into queries and client code, Entities and
Value Objects degrade into data containers, and the model becomes irrelevant.

**Solution.** A **Repository** encapsulates all the logic needed to obtain
object references. For each type needing global access, create an object that
provides the illusion of an in-memory collection of all objects of that type.

**Rules.**
- Set up access through a well-known global interface.
- Provide methods to add and remove objects, encapsulating actual insertion and
  removal in the data store.
- Provide methods that select objects by criteria and return fully instantiated
  objects or collections, encapsulating the storage and query technology.
- **Provide Repositories only for Aggregate roots that actually need direct
  access.** Not for internal objects.
- Keep the client focused on the model; delegate all object storage and access
  to Repositories.
- **The implementation may be tightly tied to infrastructure; the interface must
  be pure domain model.** Keep the interface simple even when the
  implementation isn't.
- Selection criteria may be an identity, a set of attribute values, or a
  **Specification** for more complex conditions.
- A Repository may cache objects locally, may consult other Repositories or a
  Factory, and may embed a Strategy choosing among persistence stores or using
  different stores for different object types.
- The Repository interface may include supplementary calculations, e.g. counting
  objects of a type.

**Factory vs. Repository.** Both manage the domain object life cycle. The
Factory creates *new* objects; the Repository finds *already existing* ones.
Reconstitution makes a Repository look like a Factory, but keep them distinct:
to add a new object, create it with the Factory, then hand it to the Repository
to store. Factories are pure domain; Repositories may link to infrastructure.
