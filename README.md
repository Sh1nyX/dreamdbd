DreamDBD

DreamDBD is a fan-made prototype of an alternative ranked system for an asymmetrical multiplayer game inspired by Dead by Daylight.

The project models a performance-based competitive environment where match outcomes are determined through structured evaluation instead of binary win or loss states.

It simulates the full ranked flow including:

pre-match perk bans

role-based survivor gameplay

map veto phase

match event simulation

scoring based on player actions

final rating comparison between sides

DreamDBD is not a gameplay modification.
It is a systems prototype focused on competitive structure and evaluation logic.

Core Concept

The traditional result of:

escape vs kill

is replaced by:

Killer rating score
vs
average Survivor rating score

This allows match performance to be evaluated based on efficiency, pressure and contribution rather than outcome alone.

Implemented Systems
1. Pre-Match Ban Phase

Both sides block opponent perks before the match.

Survivors block:

Hex perks

Generator regression perks

Blocking perks

Killer blocks:

Exhaustion perks

Boon perks

Second chance perks

Perk pools are loaded from:

data/perks.json


Ban logic is type-based and role-aware.

2. Survivor Roles

Each survivor selects a role that modifies scoring behavior:

Runner

Medic

Altruist

Engineer

Defined in:

rating/match/roles.js


Roles influence how match events are evaluated.

3. Map Veto System

Structured map selection:

Killer bans 4 realms

Survivors ban 4 realms

Killer selects 2

Survivors select 2

Final realm is randomly chosen from remaining pool

Random variation is selected if available

Map data:

data/maps.json

4. Match Simulation

The simulator models:

chase duration

generator progress

hook states

interaction pressure

altruistic actions

tactical efficiency

Core file:

rating/match/simulator.js


Supporting logic:

rating/match/events.js
rating/match/entities.js
rating/match/modifiers.js


The system generates an event timeline used for scoring.

5. Scoring System

Separated logic:

Killer:

rating/scoring/killerScoring.js


Survivors:

rating/scoring/survivorScoring.js


Aggregation:

rating/scoring/aggregators.js


Each event contributes rating value based on:

role context

action type

timing

efficiency

6. Result Evaluation

Final outcome is determined by:

Killer Score
vs
Average Survivor Score


This makes the system compatible with competitive evaluation rather than binary victory.

7. Match Reporting

System outputs:

full action log

rating summary

performance breakdown

Rendering handled by:

rating/ui/renderLog.js
rating/ui/renderReport.js

Ranking Model

The ranking system includes:

6 total ranks

Ranks 1 to 5 contain subranks IV to I

Each subrank requires 100 rating points

Rank 6 represents the top performance tier

Data-Driven Design

Gameplay data is externalized:

Maps:

data/maps.json


Perks:

data/perks.json


This allows balancing without modifying logic.

UI Structure

Main interface:

mainPage/


Ranked mode:

rating/


Information page:

ratingInfo/

Technology

The project is built using:

Vanilla JavaScript

ES Modules

JSON-driven configuration

Static UI architecture

No frameworks are used.

Running the Project Locally

Because the project uses ES module imports, it must be served through a local development server.

1. Install dependencies
   npm install

2. Run local server

Recommended:

npx serve .

or

npx http-server .


Do not open files directly via file://
Modules will not load in that mode.

3. Open in browser
   http://localhost:3000/mainPage/

Deployment

The project is deployed as a static site.

Production builds work without Node runtime.

Example deployment platforms:

Netlify

Cloudflare Pages

Vercel

No build step is required.

Project Purpose

DreamDBD demonstrates how:

structured bans

role influence

event-based scoring

map veto logic

can be combined into a deterministic competitive ranking system for asymmetrical multiplayer design.

License: MIT License