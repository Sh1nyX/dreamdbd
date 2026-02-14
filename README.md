DreamDBD is a fan-made prototype of an alternative ranked system for Dead by Daylight.
The project focuses on structured match evaluation, competitive mechanics and deterministic scoring instead of binary win or loss outcomes.

The system simulates a full ranked flow including:

pre-match perk bans

role-based survivor gameplay

map veto phase

match event simulation

scoring based on player actions

rating comparison between sides

Overview

DreamDBD is not a gameplay mod.
It is a systems prototype that models how a competitive environment for an asymmetrical game could function.

The core idea is replacing traditional match results with performance-based evaluation.

The final outcome is determined by comparing:

Killer rating score
against
average Survivor rating score

This allows matches to be evaluated based on efficiency rather than escape or kill count alone.

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

Ban logic is role-aware and type-based.

2. Survivor Roles

Each survivor selects a role which affects scoring:

Runner

Medic

Altruist

Engineer

Roles are defined in:

rating/match/roles.js

Each role interacts with match events differently through modifiers.

3. Map Veto System

Map selection is handled through structured voting.

Flow:

Killer bans 4 realms

Survivors ban 4 realms

Killer selects 2 realms

Survivors select 2 realms

One final realm is selected randomly from the remaining pool.
If the realm has variations, a random variation is chosen.

Map data is loaded from:

data/maps.json

4. Match Simulation

The simulator models:

player actions

hook states

chase events

generator progress

altruistic interactions

pressure scenarios

Simulation is implemented in:

rating/match/simulator.js

Supporting logic:

rating/match/events.js
rating/match/entities.js
rating/match/modifiers.js

The system generates an event timeline which becomes the base for scoring.

5. Scoring System

Scoring is separated into:

Killer scoring logic
Survivor scoring logic

Files:

rating/scoring/killerScoring.js
rating/scoring/survivorScoring.js

Each event contributes to rating value based on:

role context

action type

efficiency

interaction timing

Aggregated results are produced in:

rating/scoring/aggregators.js

6. Result Evaluation

Instead of determining a winner by escape or kills:

Final outcome =

Killer Score
vs
Average Survivor Score

This makes the system compatible with competitive analysis.

7. Match Reporting

The system outputs:

full action log

rating summary

performance breakdown

Rendering is handled by:

rating/ui/renderLog.js
rating/ui/renderReport.js

Ranking Model

The ranking system includes:

6 total ranks

Ranks 1 to 5 contain subranks from IV to I

Each subrank requires 100 rating points to advance

The 6th rank represents the top performance tier.

Data-Driven Design

Core gameplay data is externalized.

Maps:
data/maps.json

Perks:
data/perks.json

This allows easy balancing and system iteration without modifying logic.

UI Structure

Main interface:

mainPage/

Ranked mode:

rating/

Information page:

ratingInfo/

The UI is built using:

vanilla JavaScript

modular logic separation

JSON-driven content

No external frameworks are used.

Project Purpose

DreamDBD demonstrates how:

structured bans

role influence

event-based scoring

map veto logic

can be combined into a competitive ranking environment for an asymmetrical multiplayer game.

License: MIT License
