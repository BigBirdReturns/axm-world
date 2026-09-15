# Strategy Board place projection

The desktop Strategy Board host treats the player's current authored space as the presented world. The authored strategic graph remains engine law for adjacency, tolls, ownership and legal movement, but it is no longer rendered as the primary game object.

## Authority boundary

Arc owns spaces, adjacency, assets, resources, legal actions, state transitions, automatic doctrine behavior, milestones and endings. World owns the replaceable embodiment of those facts.

A place scene may display architecture, inhabitants, faction standards, atmosphere, effects and travel gates. It may not create a destination, make an illegal route executable, change ownership, spend resources, award a milestone or select an ending.

Travel gates are derived from authored adjacency and enabled only when `listExecutableStrategyMoves` reports the destination. Selecting a gate emits the ordinary `StrategyInput` advance action into the deterministic executor.

## Expression custody

Presentation material resolves only when exact `cart1_` identity matches a registered inert material set and the independently compiled World Forge v2 projection resolves to the `strategy-board` runtime family. The resulting material record carries the `wf2_` plan digest and producer lineage.

Unknown or changed cartridge identities receive the neutral projection instead of inheriting first-party material.

## Scaffold retirement

The earlier desktop graph remains useful evidence of the strategic topology but is no longer the target presentation. Current-place scenes are the next projection layer. Procedural geometry is itself temporary: governed per-place scene assets can replace it without changing authored law, portable run custody or executor behavior.

Mobile retains the DOM graph projection until a lighter place embodiment satisfies the same accessibility and performance gates.
